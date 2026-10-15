// src/demo/adaptador.js
// API simulada da demonstração. Substitui o envio HTTP do axios e responde
// as mesmas rotas do backend, com as mesmas regras de acesso, usando os
// dados do localStorage (ver banco.js). Assim a demo publicada na Vercel
// funciona sem servidor nem banco de dados.
//
// Ativada com VITE_DEMO_LOCAL=true (ver services/api.js).

import { AxiosError } from "axios";
import { banco, salvar, proximoId } from "./banco";
import { METAS_SLA, chaveDoCampo } from "./catalogo";

const STATUS = ["aberto", "em andamento", "resolvido"];
const PRIORIDADES = ["critica", "alta", "media", "baixa"];
const ROTULO_PRIORIDADE = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };
const PERFIS = ["comum", "suporte", "admin"];
const EQUIPE = ["suporte", "admin"];
const TIPOS_ANEXO = ["image/jpeg", "image/pjpeg", "image/png", "image/gif", "application/pdf"];
const LIMITE_ANEXO_MB = 1; // menor que no servidor real: o localStorage tem pouco espaço
const DIA = 86400000;
const HORA = 3600000;

const LIMITE_RISCO_SLA = 0.75;
const ICONES = ["hardware", "software", "rede", "acessos", "email", "outros"];
const HORAS_MAX = 2000;
const MOTIVO_MAX = 500;
const DADOS_FUNCIONARIO = ["setor", "cargo", "ramal", "localizacao"];
const TIPOS_CAMPO = ["texto", "numero", "selecao"];
const LIMITES = {
  campos: 8, rotulo: 80, ajuda: 120, opcoes: 15, opcao: 60, resposta: 500,
  palavras: 40, palavra: 40, sugestoes: 10, sugestao: 120, modelo: 1000,
};

const agora = () => new Date().toISOString();
const texto = (v) => (typeof v === "string" ? v.trim() : "");
// Minúsculas e sem acentos, como a comparação padrão do MariaDB ("licenca" encontra "Licença")
const normalizar = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isEquipe = (u) => EQUIPE.includes(u?.perfil);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ErroHttp {
  constructor(status, mensagem) {
    this.status = status;
    this.mensagem = mensagem;
  }
}
const falhar = (status, mensagem) => { throw new ErroHttp(status, mensagem); };

/* ------------------------------ Apoio ------------------------------ */

const publico = (u) => u && { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
// Com os dados do funcionário (setor, cargo, ramal, localização)
const completoUsuario = (u) => ({
  ...publico(u), ativo: u.ativo, createdAt: u.createdAt,
  setor: u.setor ?? null, cargo: u.cargo ?? null, ramal: u.ramal ?? null, localizacao: u.localizacao ?? null,
});
const usuarioPorId = (id) => banco().usuarios.find((u) => u.id === id);

function autenticar(config) {
  const cabecalho = config.headers?.get?.("Authorization") ?? config.headers?.Authorization;
  if (!cabecalho) falhar(401, "Token não informado.");
  const id = Number(String(cabecalho).replace(/^Bearer demo\./i, ""));
  const usuario = usuarioPorId(id);
  if (!usuario) falhar(401, "Token inválido ou expirado.");
  if (!usuario.ativo) falhar(401, "Conta desativada. Procure o administrador.");
  return usuario;
}

function exigirPerfil(usuario, ...perfis) {
  if (!perfis.includes(usuario.perfil)) falhar(403, "Acesso negado. Você não tem permissão para este recurso.");
}

function chamadoComAcesso(idTexto, usuario) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) falhar(400, "ID de chamado inválido.");
  const chamado = banco().chamados.find((c) => c.id === id);
  if (!chamado) falhar(404, "Chamado não encontrado.");
  if (chamado.usuario_id !== usuario.id && !isEquipe(usuario)) falhar(403, "Acesso negado a este chamado.");
  return chamado;
}

/* ---------------------------- Catálogo ---------------------------- */
// Mesmas regras de backend/src/services/catalogo.js

const categoriaPorId = (id) => banco().categorias.find((c) => c.id === id);
const grupoPorId = (id) => banco().grupos.find((g) => g.id === id);
const grupoResumido = (id) => {
  const g = grupoPorId(id);
  return g ? { id: g.id, nome: g.nome } : null;
};

function nomeCompleto(sub) {
  if (!sub) return "sem categoria";
  const pai = categoriaPorId(sub.parent_id);
  return pai ? `${pai.nome} › ${sub.nome}` : sub.nome;
}

// Subcategoria ativa (com categoria principal ativa) ou null
function subcategoriaAtiva(id) {
  if (!(Number.isInteger(id) && id > 0)) return null;
  const sub = categoriaPorId(id);
  if (!sub || sub.parent_id === null || !sub.ativo) return null;
  return categoriaPorId(sub.parent_id)?.ativo ? sub : null;
}

// Categoria principal vale por todas as suas subcategorias
const expandirCategorias = (ids) => banco().categorias
  .filter((c) => c.parent_id !== null && (ids.includes(c.id) || ids.includes(c.parent_id)))
  .map((c) => c.id);

const gruposDoUsuario = (usuarioId) => banco().usuarios_grupos
  .filter((v) => v.usuario_id === usuarioId)
  .map((v) => v.grupo_id);

const membrosDoGrupo = (grupoId) => banco().usuarios_grupos
  .filter((v) => v.grupo_id === grupoId)
  .map((v) => usuarioPorId(v.usuario_id))
  .filter(Boolean);

const ehMembro = (grupoId, usuarioId) =>
  banco().usuarios_grupos.some((v) => v.grupo_id === grupoId && v.usuario_id === usuarioId);

function categoriaResumida(id) {
  const sub = categoriaPorId(id);
  if (!sub) return null;
  const pai = categoriaPorId(sub.parent_id);
  return { id: sub.id, nome: sub.nome, parent_id: sub.parent_id, pai: pai ? { id: pai.id, nome: pai.nome, icone: pai.icone } : null };
}

// Chamado no formato da API: dados, SLA e relacionados
function completo(chamado) {
  return {
    ...comSla(chamado),
    usuario: publico(usuarioPorId(chamado.usuario_id)) ?? null,
    responsavel: publico(usuarioPorId(chamado.responsavel_id)) ?? null,
    grupo: grupoResumido(chamado.grupo_id),
    categoria: categoriaResumida(chamado.categoria_id),
  };
}

/* ------------------------------- SLA ------------------------------- */
// Mesma regra de backend/src/services/sla.js

const ms = (data) => (data ? new Date(data).getTime() : null);

function situacaoSla(inicio, prazo, concluidoEm, momento) {
  if (concluidoEm) return concluidoEm <= prazo ? "cumprido" : "violado";
  if (momento > prazo) return "estourado";
  if (momento - inicio >= (prazo - inicio) * LIMITE_RISCO_SLA) return "em_risco";
  return "no_prazo";
}

// Prazos gravados no chamado (com as metas da prioridade como reserva)
function prazosDoChamado(chamado) {
  const inicio = ms(chamado.createdAt);
  const meta = METAS_SLA[chamado.prioridade] || METAS_SLA.media;
  return {
    inicio,
    resposta: ms(chamado.prazo_resposta) ?? inicio + meta.resposta * HORA,
    solucao: ms(chamado.prazo_solucao) ?? inicio + meta.solucao * HORA,
  };
}

function calcularSla(chamado, momento = Date.now()) {
  const { inicio, resposta, solucao } = prazosDoChamado(chamado);
  return {
    resposta: { prazo: new Date(resposta).toISOString(), situacao: situacaoSla(inicio, resposta, ms(chamado.primeira_resposta_em), momento) },
    solucao: { prazo: new Date(solucao).toISOString(), situacao: situacaoSla(inicio, solucao, ms(chamado.resolvido_em), momento) },
  };
}

function calcularPrazos(inicio, horasResposta, horasSolucao) {
  const base = ms(inicio);
  return {
    prazo_resposta: new Date(base + Number(horasResposta) * HORA).toISOString(),
    prazo_solucao: new Date(base + Number(horasSolucao) * HORA).toISOString(),
  };
}

function horasSla(categoria, prioridade) {
  const meta = METAS_SLA[prioridade] || METAS_SLA.media;
  return {
    resposta: categoria?.sla_resposta_horas ?? meta.resposta,
    solucao: categoria?.sla_solucao_horas ?? meta.solucao,
  };
}

const prazoSolucaoMs = (c) => prazosDoChamado(c).solucao;
const comSla = (chamado) => ({ ...chamado, sla: calcularSla(chamado) });
const percentual = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

function registrarEvento(chamado, autor, mensagem) {
  const quando = agora();
  banco().interacoes.push({
    id: proximoId("interacoes"), chamado_id: chamado.id, usuario_id: autor.id,
    mensagem, tipo: "evento", createdAt: quando, updatedAt: quando,
  });
}

function tocar(chamado) {
  chamado.updatedAt = agora();
}

function erroDeCadastro({ nome, email, senha }) {
  if (texto(nome).length < 2) return "Informe o nome (mínimo 2 caracteres).";
  if (!EMAIL_REGEX.test(texto(email))) return "Informe um e-mail válido.";
  if (typeof senha !== "string" || senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  return null;
}

const lerArquivo = (arquivo) => new Promise((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onload = () => resolve(leitor.result);
  leitor.onerror = () => reject(leitor.error);
  leitor.readAsDataURL(arquivo);
});

/* ---------------------------- Formulário ---------------------------- */
// Mesmas regras de backend/src/services/formulario.js e utils/validacao.js

const LIMITES_DADOS = {
  setor: ["Setor", 80],
  cargo: ["Cargo", 80],
  ramal: ["Ramal ou telefone", 30],
  localizacao: ["Localização", 120],
  contato: ["Contato", 40],
  local: ["Local do atendimento", 120],
};

function validarDadosOpcionais(corpo, campos) {
  const dados = {};
  for (const campo of campos) {
    if (corpo[campo] === undefined) continue;
    if (corpo[campo] !== null && typeof corpo[campo] !== "string") falhar(400, `${LIMITES_DADOS[campo][0]} deve ser um texto.`);
    const valor = texto(corpo[campo]);
    if (valor.length > LIMITES_DADOS[campo][1]) {
      falhar(400, `${LIMITES_DADOS[campo][0]} deve ter no máximo ${LIMITES_DADOS[campo][1]} caracteres.`);
    }
    dados[campo] = valor || null;
  }
  return dados;
}

function validarLista(valor, { max, maxItem, nome }) {
  if (!Array.isArray(valor) || !valor.every((v) => typeof v === "string")) falhar(400, `Informe "${nome}" como uma lista de textos.`);
  const itens = [...new Set(valor.map((v) => v.trim()).filter(Boolean))];
  if (itens.length > max) falhar(400, `"${nome}" aceita no máximo ${max} itens.`);
  if (itens.some((v) => v.length > maxItem)) falhar(400, `Cada item de "${nome}" deve ter no máximo ${maxItem} caracteres.`);
  return itens;
}

function validarCampos(campos) {
  if (!Array.isArray(campos)) falhar(400, 'Informe "campos" como uma lista.');
  if (campos.length > LIMITES.campos) falhar(400, `O formulário aceita no máximo ${LIMITES.campos} campos.`);
  const valor = [];
  for (const campo of campos) {
    if (!campo || typeof campo !== "object") falhar(400, "Campo inválido no formulário.");
    const rotulo = texto(campo.rotulo);
    if (rotulo.length < 2 || rotulo.length > LIMITES.rotulo) falhar(400, `Cada campo precisa de um rótulo de 2 a ${LIMITES.rotulo} caracteres.`);
    if (!TIPOS_CAMPO.includes(campo.tipo)) falhar(400, `Tipo de campo inválido em "${rotulo}". Use: ${TIPOS_CAMPO.join(", ")}.`);
    const ajuda = texto(campo.ajuda);
    if (ajuda.length > LIMITES.ajuda) falhar(400, `A ajuda de "${rotulo}" deve ter no máximo ${LIMITES.ajuda} caracteres.`);
    let opcoes = [];
    if (campo.tipo === "selecao") {
      opcoes = validarLista(campo.opcoes ?? [], { max: LIMITES.opcoes, maxItem: LIMITES.opcao, nome: `opções de ${rotulo}` });
      if (opcoes.length < 2) falhar(400, `"${rotulo}" precisa de pelo menos 2 opções.`);
    }
    let chave = chaveDoCampo(rotulo);
    for (let n = 2; valor.some((c) => c.chave === chave); n += 1) chave = `${chaveDoCampo(rotulo)}_${n}`;
    valor.push({ chave, rotulo, tipo: campo.tipo, obrigatorio: campo.obrigatorio === true, ajuda: ajuda || null, opcoes });
  }
  return valor;
}

function validarRespostas(campos, respostas = {}) {
  if (respostas === null || typeof respostas !== "object" || Array.isArray(respostas)) {
    falhar(400, 'Informe "respostas" como um objeto { campo: valor }.');
  }
  const valor = [];
  for (const campo of campos) {
    const bruto = respostas[campo.chave];
    const resposta = typeof bruto === "number" ? String(bruto) : texto(bruto);
    if (!resposta) {
      if (campo.obrigatorio) falhar(400, `Preencha "${campo.rotulo}".`);
      continue;
    }
    if (resposta.length > LIMITES.resposta) falhar(400, `"${campo.rotulo}" deve ter no máximo ${LIMITES.resposta} caracteres.`);
    if (campo.tipo === "selecao" && !campo.opcoes.includes(resposta)) falhar(400, `Escolha uma das opções de "${campo.rotulo}".`);
    if (campo.tipo === "numero" && !Number.isFinite(Number(resposta.replace(",", ".")))) falhar(400, `"${campo.rotulo}" deve ser um número.`);
    valor.push({ chave: campo.chave, rotulo: campo.rotulo, valor: resposta });
  }
  return valor;
}

/* ------------------------------ Rotas ------------------------------ */

const rotas = [
  ["POST", /^\/register$/, ({ corpo }) => {
    const erro = erroDeCadastro(corpo);
    if (erro) falhar(400, erro);
    const email = texto(corpo.email).toLowerCase();
    if (banco().usuarios.some((u) => u.email === email)) falhar(409, "Este e-mail já está cadastrado.");
    const usuario = {
      id: proximoId("usuarios"), nome: texto(corpo.nome), email, perfil: "comum",
      ativo: true, senha: corpo.senha, createdAt: agora(),
    };
    banco().usuarios.push(usuario);
    return [201, { usuario: publico(usuario), token: `demo.${usuario.id}` }];
  }],

  ["POST", /^\/login$/, ({ corpo }) => {
    const email = texto(corpo.email).toLowerCase();
    if (!email || !corpo.senha) falhar(400, "Informe o e-mail e a senha.");
    const usuario = banco().usuarios.find((u) => u.email === email);
    if (!usuario || usuario.senha !== corpo.senha) falhar(401, "E-mail ou senha inválidos.");
    if (!usuario.ativo) falhar(403, "Conta desativada. Procure o administrador.");
    return [200, { usuario: publico(usuario), token: `demo.${usuario.id}` }];
  }],

  ["GET", /^\/me$/, ({ eu }) => {
    const { createdAt, ...dados } = completoUsuario(eu); // eslint-disable-line no-unused-vars
    return [200, dados];
  }],

  // O próprio usuário atualiza o contato que preenche os chamados
  ["PUT", /^\/me$/, ({ eu, corpo }) => {
    Object.assign(eu, validarDadosOpcionais(corpo, ["ramal", "localizacao"]));
    const { createdAt, ...dados } = completoUsuario(eu); // eslint-disable-line no-unused-vars
    return [200, dados];
  }],

  ["GET", /^\/chamados$/, ({ eu, params }) => {
    const db = banco();
    const escopo = db.chamados.filter((c) => isEquipe(eu) || c.usuario_id === eu.id);
    const lista = (valor, permitidos) =>
      String(valor || "").split(",").map((v) => v.trim()).filter((v) => permitidos.includes(v));

    const status = lista(params.status, STATUS);
    const prioridades = lista(params.prioridade, PRIORIDADES);
    const ids = (valor) => String(valor || "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const categorias = ids(params.categoria).length ? expandirCategorias(ids(params.categoria)) : null;
    let grupos = null;
    if (params.grupo === "meus") grupos = gruposDoUsuario(eu.id);
    else if (params.grupo === "nenhum") grupos = [null];
    else if (ids(params.grupo).length) grupos = ids(params.grupo);
    const momento = Date.now();
    const pendente = (c) => c.status !== "resolvido";
    const situacaoSolucao = (c) => calcularSla(c, momento).solucao.situacao;
    const busca = normalizar(texto(params.busca));
    const numero = Number(busca.replace(/^(#|ch-?)/i, ""));

    let filtrados = escopo.filter((c) => {
      if (status.length && !status.includes(c.status)) return false;
      if (prioridades.length && !prioridades.includes(c.prioridade)) return false;
      if (categorias && !categorias.includes(c.categoria_id)) return false;
      if (grupos && !grupos.includes(c.grupo_id)) return false;
      if (params.sla === "estourado" && !(pendente(c) && situacaoSolucao(c) === "estourado")) return false;
      if (params.sla === "em_risco" && !(pendente(c) && situacaoSolucao(c) === "em_risco")) return false;
      if (params.responsavel === "eu" && c.responsavel_id !== eu.id) return false;
      if (params.responsavel === "nenhum" && c.responsavel_id !== null) return false;
      if (Number(params.responsavel) > 0 && c.responsavel_id !== Number(params.responsavel)) return false;
      if (busca) {
        const casa = normalizar(c.titulo).includes(busca) || normalizar(c.descricao).includes(busca)
          || (Number.isInteger(numero) && numero > 0 && c.id === numero);
        if (!casa) return false;
      }
      return true;
    });

    const porData = (campo, sentido) => (a, b) => sentido * (new Date(a[campo]) - new Date(b[campo]));
    const ordens = {
      recentes: porData("createdAt", -1),
      antigos: porData("createdAt", 1),
      atualizados: porData("updatedAt", -1),
      prioridade: (a, b) => PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade) || porData("createdAt", 1)(a, b),
      prazo: (a, b) => prazoSolucaoMs(a) - prazoSolucaoMs(b) || porData("createdAt", 1)(a, b),
    };
    filtrados = [...filtrados].sort(ordens[params.ordem] || ordens.recentes);

    const porPagina = Math.min(50, Math.max(1, parseInt(params.porPagina, 10) || 15));
    const pagina = Math.max(1, parseInt(params.pagina, 10) || 1);

    return [200, {
      dados: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina).map(completo),
      total: filtrados.length,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(filtrados.length / porPagina)),
      contadores: {
        todos: escopo.length,
        pendentes: escopo.filter(pendente).length,
        resolvidos: escopo.filter((c) => c.status === "resolvido").length,
        atribuidosAMim: escopo.filter((c) => pendente(c) && c.responsavel_id === eu.id).length,
        semResponsavel: escopo.filter((c) => pendente(c) && c.responsavel_id === null).length,
        atrasados: escopo.filter((c) => pendente(c) && situacaoSolucao(c) === "estourado").length,
        doMeuGrupo: isEquipe(eu)
          ? db.chamados.filter((c) => pendente(c) && gruposDoUsuario(eu.id).includes(c.grupo_id)).length
          : 0,
      },
    }];
  }],

  ["POST", /^\/chamados$/, ({ eu, corpo }) => {
    const titulo = texto(corpo.titulo);
    const descricao = texto(corpo.descricao);
    if (titulo.length < 3) falhar(400, "Informe um título (mínimo 3 caracteres).");
    if (titulo.length > 255) falhar(400, "O título deve ter no máximo 255 caracteres.");
    if (!descricao) falhar(400, "Descreva o problema.");
    // A subcategoria define prioridade, prazos e grupo (prioridade enviada é ignorada)
    const sub = subcategoriaAtiva(corpo.categoria_id);
    if (!sub) falhar(400, 'Escolha uma subcategoria válida do catálogo ("categoria_id").');
    const respostas = validarRespostas(sub.campos, corpo.respostas ?? {});
    const contato = validarDadosOpcionais(corpo, ["contato", "local"]);
    const prioridade = sub.prioridade || "media";
    const horas = horasSla(sub, prioridade);
    const quando = agora();
    const chamado = {
      id: proximoId("chamados"), titulo, descricao, status: "aberto", prioridade,
      contato: contato.contato !== undefined ? contato.contato : eu.ramal ?? null,
      local: contato.local !== undefined ? contato.local : eu.localizacao ?? null,
      respostas,
      categoria_id: sub.id, grupo_id: sub.grupo_id ?? categoriaPorId(sub.parent_id).grupo_id ?? null,
      usuario_id: eu.id, responsavel_id: null, resolvido_em: null, primeira_resposta_em: null,
      ...calcularPrazos(quando, horas.resposta, horas.solucao),
      createdAt: quando, updatedAt: quando,
    };
    banco().chamados.push(chamado);
    return [201, completo(chamado)];
  }],

  ["GET", /^\/chamados\/([^/]+)$/, ({ eu, m }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const db = banco();
    const interacoes = db.interacoes
      .filter((i) => i.chamado_id === chamado.id && (i.tipo !== "nota" || isEquipe(eu)))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id)
      .map((i) => {
        const autor = usuarioPorId(i.usuario_id);
        return { ...i, usuario: autor ? { id: autor.id, nome: autor.nome, perfil: autor.perfil } : null };
      });
    const anexos = db.anexos
      .filter((a) => a.chamado_id === chamado.id)
      .map(({ id, nome_original, createdAt }) => ({ id, nome_original, createdAt }));
    const solicitante = usuarioPorId(chamado.usuario_id);
    return [200, {
      ...completo(chamado),
      // No detalhe, o solicitante vem com setor e cargo
      usuario: solicitante ? { ...publico(solicitante), setor: solicitante.setor ?? null, cargo: solicitante.cargo ?? null } : null,
      interacoes,
      anexos,
    }];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/status$/, ({ eu, m, corpo }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const { status } = corpo;
    if (!STATUS.includes(status)) falhar(400, `Status inválido. Use: ${STATUS.join(", ")}.`);
    if (!isEquipe(eu) && !["aberto", "resolvido"].includes(status)) {
      falhar(403, "Apenas a equipe de suporte pode colocar o chamado em andamento.");
    }
    if (status === chamado.status) return [200, completo(chamado)];
    const anterior = chamado.status;
    chamado.status = status;
    chamado.resolvido_em = status === "resolvido" ? agora() : null;
    const assumiu = status === "em andamento" && isEquipe(eu) && !chamado.responsavel_id;
    if (assumiu) chamado.responsavel_id = eu.id;
    tocar(chamado);
    registrarEvento(chamado, eu, `alterou o status de "${anterior}" para "${status}"`);
    if (assumiu) registrarEvento(chamado, eu, "assumiu o chamado");
    return [200, completo(chamado)];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/prioridade$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "suporte", "admin");
    const chamado = chamadoComAcesso(m[1], eu);
    const { prioridade } = corpo;
    if (!PRIORIDADES.includes(prioridade)) falhar(400, `Prioridade inválida. Use: ${PRIORIDADES.join(", ")}.`);
    if (prioridade !== chamado.prioridade) {
      const anterior = chamado.prioridade;
      chamado.prioridade = prioridade;
      Object.assign(chamado, calcularPrazos(chamado.createdAt, METAS_SLA[prioridade].resposta, METAS_SLA[prioridade].solucao));
      tocar(chamado);
      registrarEvento(chamado, eu, `alterou a prioridade de ${ROTULO_PRIORIDADE[anterior]} para ${ROTULO_PRIORIDADE[prioridade]}`);
    }
    return [200, completo(chamado)];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/categoria$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "suporte", "admin");
    const chamado = chamadoComAcesso(m[1], eu);
    const sub = subcategoriaAtiva(corpo.categoria_id);
    if (!sub) falhar(400, 'Escolha uma subcategoria válida do catálogo ("categoria_id").');
    if (sub.id !== chamado.categoria_id) {
      const anterior = categoriaPorId(chamado.categoria_id);
      const prioridadeAnterior = chamado.prioridade;
      const prioridade = sub.prioridade || "media";
      const horas = horasSla(sub, prioridade);
      chamado.categoria_id = sub.id;
      chamado.prioridade = prioridade;
      Object.assign(chamado, calcularPrazos(chamado.createdAt, horas.resposta, horas.solucao));
      tocar(chamado);
      let mensagem = `alterou a categoria de ${nomeCompleto(anterior)} para ${nomeCompleto(sub)}`;
      if (prioridade !== prioridadeAnterior) mensagem += ` (prioridade ${ROTULO_PRIORIDADE[prioridade]})`;
      registrarEvento(chamado, eu, mensagem);
    }
    return [200, completo(chamado)];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/transferencia$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "suporte", "admin");
    const chamado = chamadoComAcesso(m[1], eu);
    const { grupo_id: grupoId, responsavel_id: responsavelId } = corpo;
    const motivo = texto(corpo.motivo);
    if (motivo.length < 3) falhar(400, "Informe o motivo da transferência.");
    if (motivo.length > MOTIVO_MAX) falhar(400, `O motivo deve ter no máximo ${MOTIVO_MAX} caracteres.`);
    const informouGrupo = grupoId !== undefined && grupoId !== null;
    const informouResponsavel = responsavelId !== undefined && responsavelId !== null;
    if (!informouGrupo && !informouResponsavel) falhar(400, "Informe o grupo e/ou o técnico de destino.");

    let grupo = null;
    if (informouGrupo) {
      grupo = Number.isInteger(grupoId) ? grupoPorId(grupoId) : null;
      if (!grupo || !grupo.ativo) falhar(400, "Grupo de destino não encontrado.");
    }
    let responsavel = null;
    if (informouResponsavel) {
      responsavel = Number.isInteger(responsavelId) ? usuarioPorId(responsavelId) : null;
      if (!responsavel || !responsavel.ativo || !isEquipe(responsavel)) {
        falhar(400, "O técnico precisa ser um usuário ativo da equipe (suporte ou admin).");
      }
      if (grupo && !ehMembro(grupo.id, responsavel.id)) falhar(400, `${responsavel.nome} não faz parte do grupo ${grupo.nome}.`);
    }

    const novoGrupo = grupo ? grupo.id : chamado.grupo_id;
    let novoResponsavel = responsavel ? responsavel.id : chamado.responsavel_id;
    if (grupo && !responsavel && grupo.id !== chamado.grupo_id) novoResponsavel = null;
    if (novoGrupo === chamado.grupo_id && novoResponsavel === chamado.responsavel_id) {
      falhar(400, "O chamado já está com esse grupo e técnico.");
    }

    chamado.grupo_id = novoGrupo;
    chamado.responsavel_id = novoResponsavel;
    tocar(chamado);
    const destino = [grupo?.nome, responsavel?.nome].filter(Boolean).join(" / ");
    registrarEvento(chamado, eu, `transferiu o chamado para ${destino}. Motivo: ${motivo}`);
    return [200, completo(chamado)];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/responsavel$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "suporte", "admin");
    const chamado = chamadoComAcesso(m[1], eu);
    const novoId = corpo.responsavel_id;
    if (novoId !== null && !(Number.isInteger(novoId) && novoId > 0)) {
      falhar(400, 'Informe "responsavel_id" com o ID de um técnico, ou null para remover.');
    }
    let responsavel = null;
    if (novoId !== null) {
      responsavel = usuarioPorId(novoId);
      if (!responsavel || !responsavel.ativo || !isEquipe(responsavel)) {
        falhar(400, "O responsável precisa ser um usuário ativo da equipe (suporte ou admin).");
      }
    }
    if (novoId === chamado.responsavel_id) return [200, completo(chamado)];
    chamado.responsavel_id = novoId;
    tocar(chamado);
    let mensagem = "removeu o responsável do chamado";
    if (responsavel) mensagem = responsavel.id === eu.id ? "assumiu o chamado" : `atribuiu o chamado a ${responsavel.nome}`;
    registrarEvento(chamado, eu, mensagem);
    return [200, completo(chamado)];
  }],

  ["POST", /^\/chamados\/([^/]+)\/interacoes$/, ({ eu, m, corpo }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const mensagem = texto(corpo.mensagem);
    if (!mensagem) falhar(400, "A mensagem não pode ficar vazia.");
    const interna = corpo.interna === true;
    if (interna && !isEquipe(eu)) falhar(403, "Apenas a equipe de suporte pode escrever notas internas.");
    const quando = agora();
    const interacao = {
      id: proximoId("interacoes"), chamado_id: chamado.id, usuario_id: eu.id,
      mensagem, tipo: interna ? "nota" : "mensagem", createdAt: quando, updatedAt: quando,
    };
    banco().interacoes.push(interacao);
    // A primeira mensagem da equipe ao solicitante conta para o SLA de resposta (notas não contam)
    if (!interna && isEquipe(eu) && eu.id !== chamado.usuario_id && !chamado.primeira_resposta_em) {
      chamado.primeira_resposta_em = quando;
    }
    return [201, interacao];
  }],

  ["POST", /^\/chamados\/([^/]+)\/anexos$/, async ({ eu, m, config }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const arquivo = config.data instanceof FormData ? config.data.get("anexo") : null;
    if (!arquivo) falhar(400, 'Nenhum arquivo enviado (campo "anexo").');
    if (!TIPOS_ANEXO.includes(arquivo.type)) falhar(400, "Tipo de arquivo não permitido. Envie imagens (JPG, PNG, GIF) ou PDF.");
    if (arquivo.size > LIMITE_ANEXO_MB * 1024 * 1024) {
      falhar(400, `Na demonstração, os anexos podem ter até ${LIMITE_ANEXO_MB} MB (no sistema real, até 10 MB).`);
    }
    const anexo = {
      id: proximoId("anexos"), chamado_id: chamado.id, nome_original: arquivo.name,
      conteudo: await lerArquivo(arquivo), createdAt: agora(),
    };
    banco().anexos.push(anexo);
    if (!salvar()) {
      banco().anexos.pop();
      falhar(400, "O espaço da demonstração neste navegador acabou. Use \"Restaurar dados de exemplo\" para liberar.");
    }
    return [201, { id: anexo.id, nome_original: anexo.nome_original, createdAt: anexo.createdAt }];
  }],

  ["GET", /^\/chamados\/([^/]+)\/anexos\/([^/]+)$/, async ({ eu, m }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const anexo = banco().anexos.find((a) => a.id === Number(m[2]) && a.chamado_id === chamado.id);
    if (!anexo) falhar(404, "Anexo não encontrado.");
    const arquivo = await (await fetch(anexo.conteudo)).blob();
    return [200, arquivo];
  }],

  ["GET", /^\/equipe$/, ({ eu }) => {
    exigirPerfil(eu, "suporte", "admin");
    const membros = banco().usuarios
      .filter((u) => u.ativo && isEquipe(u))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(({ id, nome, perfil }) => ({
        id, nome, perfil,
        grupos: gruposDoUsuario(id).map(grupoPorId).filter((g) => g?.ativo)
          .sort((a, b) => a.id - b.id).map((g) => ({ id: g.id, nome: g.nome })),
      }));
    return [200, membros];
  }],

  /* ----- Catálogo (leitura para todos; edição só admin) ----- */

  ["GET", /^\/categorias$/, ({ eu, params }) => {
    const incluirInativas = params.inativas === "1" && eu.perfil === "admin";
    return [200, arvoreCategorias(incluirInativas)];
  }],

  ["POST", /^\/categorias$/, ({ eu, corpo }) => {
    exigirPerfil(eu, "admin");
    const parentId = corpo.parent_id ?? null;
    let pai = null;
    if (parentId !== null) {
      pai = Number.isInteger(parentId) ? categoriaPorId(parentId) : null;
      if (!pai || pai.parent_id !== null) falhar(400, "A categoria principal informada não existe.");
    }
    const dados = validarCategoria(corpo, { ehSubcategoria: Boolean(pai) });
    if (nomeDeCategoriaEmUso(dados.nome, parentId)) falhar(409, "Já existe um item com esse nome neste nível do catálogo.");
    const categoria = {
      id: proximoId("categorias"), nome: dados.nome, descricao: dados.descricao ?? null,
      icone: pai ? null : dados.icone || "outros", parent_id: parentId,
      prioridade: dados.prioridade ?? null,
      sla_resposta_horas: dados.sla_resposta_horas ?? null, sla_solucao_horas: dados.sla_solucao_horas ?? null,
      grupo_id: dados.grupo_id !== undefined ? dados.grupo_id : pai?.grupo_id ?? null,
      ativo: dados.ativo ?? true,
      palavras_chave: dados.palavras_chave ?? [], sugestoes: dados.sugestoes ?? [],
      modelo_descricao: dados.modelo_descricao ?? null, campos: dados.campos ?? [],
    };
    banco().categorias.push(categoria);
    return [201, { ...categoria }];
  }],

  ["PUT", /^\/categorias\/([^/]+)$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    const categoria = categoriaPorId(Number(m[1]));
    if (!categoria) falhar(404, "Categoria não encontrada.");
    const dados = validarCategoria(corpo, { ehSubcategoria: categoria.parent_id !== null, atual: categoria });
    if (dados.nome && nomeDeCategoriaEmUso(dados.nome, categoria.parent_id, categoria.id)) {
      falhar(409, "Já existe um item com esse nome neste nível do catálogo.");
    }
    Object.assign(categoria, dados);
    return [200, { ...categoria }];
  }],

  /* ----- Grupos técnicos ----- */

  ["GET", /^\/grupos$/, ({ eu }) => {
    exigirPerfil(eu, "suporte", "admin");
    const { grupos, chamados } = banco();
    return [200, [...grupos].sort((a, b) => a.id - b.id).map((g) => ({
      ...grupoComMembros(g),
      pendentes: chamados.filter((c) => c.status !== "resolvido" && c.grupo_id === g.id).length,
    }))];
  }],

  ["POST", /^\/grupos$/, ({ eu, corpo }) => {
    exigirPerfil(eu, "admin");
    const dados = validarGrupo(corpo);
    const membros = corpo.membros !== undefined ? validarMembros(corpo.membros) : [];
    const grupo = {
      id: proximoId("grupos"), nome: dados.nome, descricao: dados.descricao ?? null, ativo: dados.ativo ?? true, createdAt: agora(),
    };
    banco().grupos.push(grupo);
    definirMembros(grupo.id, membros);
    return [201, grupoComMembros(grupo)];
  }],

  ["PUT", /^\/grupos\/([^/]+)$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    const grupo = grupoPorId(Number(m[1]));
    if (!grupo) falhar(404, "Grupo não encontrado.");
    const dados = validarGrupo(corpo, grupo);
    const membros = corpo.membros !== undefined ? validarMembros(corpo.membros) : null;
    Object.assign(grupo, dados);
    if (membros) definirMembros(grupo.id, membros);
    return [200, grupoComMembros(grupo)];
  }],

  ["GET", /^\/admin\/resumo$/, ({ eu, params }) => {
    exigirPerfil(eu, "admin");
    return [200, resumoAdmin(Number(params.fuso) || 0)];
  }],

  ["GET", /^\/usuarios$/, ({ eu }) => {
    exigirPerfil(eu, "admin");
    const { usuarios, chamados } = banco();
    return [200, [...usuarios]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((u) => ({
        ...completoUsuario(u),
        total_chamados: chamados.filter((c) => c.usuario_id === u.id).length,
      }))];
  }],

  ["POST", /^\/usuarios$/, ({ eu, corpo }) => {
    exigirPerfil(eu, "admin");
    const erro = erroDeCadastro(corpo);
    if (erro) falhar(400, erro);
    const perfil = corpo.perfil || "comum";
    if (!PERFIS.includes(perfil)) falhar(400, `Perfil inválido. Use: ${PERFIS.join(", ")}.`);
    const dados = validarDadosOpcionais(corpo, DADOS_FUNCIONARIO);
    const email = texto(corpo.email).toLowerCase();
    if (banco().usuarios.some((u) => u.email === email)) falhar(409, "Este e-mail já está cadastrado.");
    const usuario = {
      id: proximoId("usuarios"), nome: texto(corpo.nome), email, perfil,
      setor: null, cargo: null, ramal: null, localizacao: null, ...dados,
      ativo: true, senha: corpo.senha, createdAt: agora(),
    };
    banco().usuarios.push(usuario);
    return [201, { ...completoUsuario(usuario), total_chamados: 0 }];
  }],

  ["PUT", /^\/usuarios\/([^/]+)$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    const usuario = usuarioPorId(Number(m[1]));
    if (!usuario) falhar(404, "Usuário não encontrado.");
    Object.assign(usuario, validarDadosOpcionais(corpo, DADOS_FUNCIONARIO));
    return [200, completoUsuario(usuario)];
  }],

  ["PUT", /^\/usuarios\/([^/]+)\/perfil$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    if (!PERFIS.includes(corpo.perfil)) falhar(400, `Perfil inválido. Use: ${PERFIS.join(", ")}.`);
    const usuario = usuarioPorId(Number(m[1]));
    if (!usuario) falhar(404, "Usuário não encontrado.");
    if (usuario.id === eu.id && corpo.perfil !== "admin") falhar(400, "Você não pode remover o seu próprio perfil de admin.");
    usuario.perfil = corpo.perfil;
    // Quem deixa a equipe sai também dos grupos técnicos
    if (!isEquipe(usuario)) definirGruposDoUsuario(usuario.id, []);
    return [200, completoUsuario(usuario)];
  }],

  ["PUT", /^\/usuarios\/([^/]+)\/status$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    if (typeof corpo.ativo !== "boolean") falhar(400, 'Informe "ativo" como true ou false.');
    const usuario = usuarioPorId(Number(m[1]));
    if (!usuario) falhar(404, "Usuário não encontrado.");
    if (usuario.id === eu.id && !corpo.ativo) falhar(400, "Você não pode desativar a sua própria conta.");
    usuario.ativo = corpo.ativo;
    return [200, completoUsuario(usuario)];
  }],
];

// Rotas que não exigem login
const PUBLICAS = ["/register", "/login"];

/* ---------------- Validações do catálogo e dos grupos ---------------- */
// Mesmas regras de CategoriaController e GrupoController (nomes comparados
// sem diferenciar maiúsculas e acentos, como o MariaDB)

const ordenarCatalogo = (lista) => lista.sort((a, b) => (
  (a.nome.startsWith("Outros") - b.nome.startsWith("Outros")) || a.nome.localeCompare(b.nome, "pt-BR")
));

function arvoreCategorias(incluirInativas) {
  const visivel = (c) => incluirInativas || c.ativo;
  const comGrupo = (c) => ({ ...c, grupo: grupoResumido(c.grupo_id) });
  const { categorias } = banco();
  return ordenarCatalogo(categorias
    .filter((c) => c.parent_id === null && visivel(c))
    .map((c) => ({
      ...comGrupo(c),
      subcategorias: ordenarCatalogo(categorias.filter((s) => s.parent_id === c.id && visivel(s)).map(comGrupo)),
    })));
}

const horasValidas = (h) => typeof h === "number" && Number.isFinite(h) && h > 0 && h <= HORAS_MAX;

function validarCategoria(corpo, { ehSubcategoria, atual }) {
  const dados = {};
  if (corpo.nome !== undefined || !atual) {
    const nome = texto(corpo.nome);
    if (nome.length < 2 || nome.length > 100) falhar(400, "Informe o nome (de 2 a 100 caracteres).");
    dados.nome = nome;
  }
  if (corpo.descricao !== undefined) {
    const descricao = texto(corpo.descricao);
    if (descricao.length > 255) falhar(400, "A descrição deve ter no máximo 255 caracteres.");
    dados.descricao = descricao || null;
  }
  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== "boolean") falhar(400, 'Informe "ativo" como true ou false.');
    dados.ativo = corpo.ativo;
  }
  if (corpo.grupo_id !== undefined) {
    if (corpo.grupo_id !== null && !(Number.isInteger(corpo.grupo_id) && grupoPorId(corpo.grupo_id))) {
      falhar(400, "Grupo não encontrado.");
    }
    dados.grupo_id = corpo.grupo_id;
  }
  if (corpo.palavras_chave !== undefined) {
    dados.palavras_chave = validarLista(corpo.palavras_chave, { max: LIMITES.palavras, maxItem: LIMITES.palavra, nome: "palavras_chave" });
  }
  if (!ehSubcategoria) {
    if (corpo.icone !== undefined) {
      if (!ICONES.includes(corpo.icone)) falhar(400, `Ícone inválido. Use: ${ICONES.join(", ")}.`);
      dados.icone = corpo.icone;
    }
    return dados;
  }
  if (corpo.prioridade !== undefined || !atual) {
    if (!PRIORIDADES.includes(corpo.prioridade)) falhar(400, `Prioridade inválida. Use: ${PRIORIDADES.join(", ")}.`);
    dados.prioridade = corpo.prioridade;
  }
  const meta = METAS_SLA[dados.prioridade || atual?.prioridade];
  const resposta = corpo.sla_resposta_horas ?? (atual ? atual.sla_resposta_horas : meta.resposta);
  const solucao = corpo.sla_solucao_horas ?? (atual ? atual.sla_solucao_horas : meta.solucao);
  if (!horasValidas(resposta) || !horasValidas(solucao)) falhar(400, `Os prazos devem ser números de horas entre 0 e ${HORAS_MAX}.`);
  if (resposta > solucao) falhar(400, "O prazo de resposta não pode ser maior que o de solução.");
  dados.sla_resposta_horas = resposta;
  dados.sla_solucao_horas = solucao;
  if (corpo.sugestoes !== undefined) {
    dados.sugestoes = validarLista(corpo.sugestoes, { max: LIMITES.sugestoes, maxItem: LIMITES.sugestao, nome: "sugestoes" });
  }
  if (corpo.modelo_descricao !== undefined) {
    if (corpo.modelo_descricao !== null && typeof corpo.modelo_descricao !== "string") falhar(400, 'Informe "modelo_descricao" como texto.');
    const modelo = (corpo.modelo_descricao || "").trim();
    if (modelo.length > LIMITES.modelo) falhar(400, `O modelo de descrição deve ter no máximo ${LIMITES.modelo} caracteres.`);
    dados.modelo_descricao = modelo || null;
  }
  if (corpo.campos !== undefined) dados.campos = validarCampos(corpo.campos);
  return dados;
}

const nomeDeCategoriaEmUso = (nome, parentId, ignorarId) =>
  banco().categorias.some((c) => normalizar(c.nome) === normalizar(nome) && c.parent_id === parentId && c.id !== ignorarId);

function validarGrupo(corpo, atual) {
  const dados = {};
  if (corpo.nome !== undefined || !atual) {
    const nome = texto(corpo.nome);
    if (nome.length < 2 || nome.length > 100) falhar(400, "Informe o nome do grupo (de 2 a 100 caracteres).");
    if (banco().grupos.some((g) => normalizar(g.nome) === normalizar(nome) && g.id !== atual?.id)) {
      falhar(409, "Já existe um grupo com esse nome.");
    }
    dados.nome = nome;
  }
  if (corpo.descricao !== undefined) {
    const descricao = texto(corpo.descricao);
    if (descricao.length > 255) falhar(400, "A descrição deve ter no máximo 255 caracteres.");
    dados.descricao = descricao || null;
  }
  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== "boolean") falhar(400, 'Informe "ativo" como true ou false.');
    dados.ativo = corpo.ativo;
  }
  return dados;
}

function validarMembros(membros) {
  if (!Array.isArray(membros) || !membros.every((id) => Number.isInteger(id) && id > 0)) {
    falhar(400, 'Informe "membros" como uma lista de IDs de usuários.');
  }
  const ids = [...new Set(membros)];
  if (!ids.every((id) => isEquipe(usuarioPorId(id)))) falhar(400, "Os membros precisam ser usuários da equipe (suporte ou admin).");
  return ids;
}

function definirMembros(grupoId, ids) {
  const db = banco();
  db.usuarios_grupos = db.usuarios_grupos.filter((v) => v.grupo_id !== grupoId)
    .concat(ids.map((usuarioId) => ({ usuario_id: usuarioId, grupo_id: grupoId })));
}

function definirGruposDoUsuario(usuarioId, ids) {
  const db = banco();
  db.usuarios_grupos = db.usuarios_grupos.filter((v) => v.usuario_id !== usuarioId)
    .concat(ids.map((grupoId) => ({ usuario_id: usuarioId, grupo_id: grupoId })));
}

function grupoComMembros(g) {
  return {
    id: g.id, nome: g.nome, descricao: g.descricao, ativo: g.ativo,
    membros: membrosDoGrupo(g.id)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((u) => ({ ...publico(u), ativo: u.ativo })),
  };
}

function resumoAdmin(fuso) {
  const { chamados, usuarios } = banco();
  const agoraMs = Date.now();
  const desde = (dias) => agoraMs - dias * DIA;
  const pendentes = chamados.filter((c) => c.status !== "resolvido");
  const horas = (c) => (new Date(c.resolvido_em) - new Date(c.createdAt)) / 3600000;
  const media = (lista) => (lista.length ? Math.round((lista.reduce((s, c) => s + horas(c), 0) / lista.length) * 10) / 10 : null);
  const resolvidos30 = chamados.filter((c) => c.resolvido_em && new Date(c.resolvido_em) >= desde(30));
  const dataLocal = (ms) => new Date(ms - fuso * 60000).toISOString().slice(0, 10);
  const contar = (lista, campo, chaves) =>
    Object.fromEntries(chaves.map((k) => [k, lista.filter((x) => x[campo] === k).length]));

  const porDia = [];
  for (let i = 13; i >= 0; i -= 1) porDia.push({ data: dataLocal(agoraMs - i * DIA), abertos: 0, resolvidos: 0 });
  const indice = Object.fromEntries(porDia.map((d) => [d.data, d]));
  chamados.forEach((c) => {
    const aberto = indice[dataLocal(new Date(c.createdAt).getTime())];
    if (aberto) aberto.abertos += 1;
    if (c.resolvido_em) {
      const resolvido = indice[dataLocal(new Date(c.resolvido_em).getTime())];
      if (resolvido) resolvido.resolvidos += 1;
    }
  });

  const ativos = usuarios.filter((u) => u.ativo);
  const porPerfil = contar(ativos, "perfil", PERFIS);

  // SLA: entregas dos últimos 30 dias e situação atual da fila
  const sla = (c) => calcularSla(c, agoraMs);
  const respondidos30 = chamados.filter((c) => c.primeira_resposta_em && new Date(c.primeira_resposta_em) >= desde(30));
  const cumpriu = (lista, prazo) => lista.filter((c) => sla(c)[prazo].situacao === "cumprido").length;
  const abertos30 = chamados.filter((c) => new Date(c.createdAt) >= desde(30));

  return {
    chamados: {
      total: chamados.length,
      porStatus: contar(chamados, "status", STATUS),
      pendentesPorPrioridade: contar(pendentes, "prioridade", PRIORIDADES),
      semResponsavel: pendentes.filter((c) => c.responsavel_id === null).length,
    },
    resolucao: { periodoDias: 30, resolvidos: resolvidos30.length, horasMedias: media(resolvidos30) },
    sla: {
      solucao: { cumpridos: cumpriu(resolvidos30, "solucao"), total: resolvidos30.length, percentual: percentual(cumpriu(resolvidos30, "solucao"), resolvidos30.length) },
      resposta: { cumpridos: cumpriu(respondidos30, "resposta"), total: respondidos30.length, percentual: percentual(cumpriu(respondidos30, "resposta"), respondidos30.length) },
      estourados: pendentes.filter((c) => sla(c).solucao.situacao === "estourado").length,
      emRisco: pendentes.filter((c) => sla(c).solucao.situacao === "em_risco").length,
      semResposta: pendentes.filter((c) => sla(c).resposta.situacao === "estourado").length,
    },
    porDia,
    porCategoria: [...banco().categorias]
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((categoria) => {
        const subs = expandirCategorias([categoria.id]);
        const daCategoria = abertos30.filter((c) => subs.includes(c.categoria_id));
        return {
          id: categoria.id, nome: categoria.nome, icone: categoria.icone,
          total: daCategoria.length,
          pendentes: daCategoria.filter((c) => c.status !== "resolvido").length,
        };
      }),
    porGrupo: banco().grupos
      .filter((g) => g.ativo)
      .sort((a, b) => a.id - b.id)
      .map((grupo) => {
        const fila = pendentes.filter((c) => c.grupo_id === grupo.id);
        return {
          id: grupo.id, nome: grupo.nome,
          pendentes: fila.length,
          semResponsavel: fila.filter((c) => !c.responsavel_id).length,
          estourados: fila.filter((c) => sla(c).solucao.situacao === "estourado").length,
        };
      }),
    equipe: ativos
      .filter(isEquipe)
      .map((u) => {
        const resolvidos = resolvidos30.filter((c) => c.responsavel_id === u.id);
        return {
          id: u.id, nome: u.nome, perfil: u.perfil,
          pendentes: pendentes.filter((c) => c.responsavel_id === u.id).length,
          resolvidos: resolvidos.length,
          horasMedias: media(resolvidos),
          noPrazo: percentual(cumpriu(resolvidos, "solucao"), resolvidos.length),
        };
      })
      .sort((a, b) => b.resolvidos - a.resolvidos || a.nome.localeCompare(b.nome)),
    usuarios: {
      ativos: ativos.length,
      inativos: usuarios.length - ativos.length,
      porPerfil,
    },
    pendentesMaisAntigos: [...pendentes]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 5)
      .map(completo),
  };
}

/* ----------------------------- Adaptador ----------------------------- */

export default async function adaptadorDemo(config) {
  // Pequena espera para parecer uma rede de verdade (e mostrar os carregamentos).
  // Nos testes automatizados (MODE === "test") não há espera.
  if (import.meta.env?.MODE !== "test") {
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  }

  const metodo = (config.method || "get").toUpperCase();
  const caminho = (config.url || "").replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "").split("?")[0];
  let corpo = {};
  if (typeof config.data === "string" && config.data) {
    try { corpo = JSON.parse(config.data); } catch { corpo = {}; }
  }

  const responder = (status, data) => {
    const resposta = { data, status, statusText: String(status), headers: {}, config, request: {} };
    if (status >= 400) {
      throw new AxiosError(data?.error || "Erro", status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, null, resposta);
    }
    return resposta;
  };

  try {
    const rota = rotas.find(([m, regex]) => m === metodo && regex.test(caminho));
    if (!rota) return responder(404, { error: "Rota não encontrada." });

    const eu = PUBLICAS.includes(caminho) ? null : autenticar(config);
    const [status, data] = await rota[2]({ eu, corpo, params: config.params || {}, m: caminho.match(rota[1]), config });
    salvar();
    return responder(status, data);
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { error: erro.mensagem });
    if (erro instanceof AxiosError) throw erro;
    console.error(erro);
    return responder(500, { error: "Erro interno da demonstração." });
  }
}
