// src/demo/adaptador.js
// API simulada da demonstração. Substitui o envio HTTP do axios e responde
// as mesmas rotas do backend, com as mesmas regras de acesso, usando os
// dados do localStorage (ver banco.js). Assim a demo publicada na Vercel
// funciona sem servidor nem banco de dados.
//
// Ativada com VITE_DEMO_LOCAL=true (ver services/api.js).

import { AxiosError } from "axios";
import { banco, salvar, proximoId } from "./banco";

const STATUS = ["aberto", "em andamento", "resolvido"];
const PRIORIDADES = ["critica", "alta", "media", "baixa"];
const ROTULO_PRIORIDADE = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };
const PERFIS = ["comum", "suporte", "admin"];
const EQUIPE = ["suporte", "admin"];
const TIPOS_ANEXO = ["image/jpeg", "image/pjpeg", "image/png", "image/gif", "application/pdf"];
const LIMITE_ANEXO_MB = 1; // menor que no servidor real: o localStorage tem pouco espaço
const DIA = 86400000;

const agora = () => new Date().toISOString();
const texto = (v) => (typeof v === "string" ? v.trim() : "");
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

function comPessoas(chamado) {
  return {
    ...chamado,
    usuario: publico(usuarioPorId(chamado.usuario_id)) ?? null,
    responsavel: publico(usuarioPorId(chamado.responsavel_id)) ?? null,
  };
}

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

  ["GET", /^\/me$/, ({ eu }) => [200, { ...publico(eu), ativo: eu.ativo }]],

  ["GET", /^\/chamados$/, ({ eu, params }) => {
    const db = banco();
    const escopo = db.chamados.filter((c) => isEquipe(eu) || c.usuario_id === eu.id);
    const lista = (valor, permitidos) =>
      String(valor || "").split(",").map((v) => v.trim()).filter((v) => permitidos.includes(v));

    const status = lista(params.status, STATUS);
    const prioridades = lista(params.prioridade, PRIORIDADES);
    const busca = texto(params.busca).toLowerCase();
    const numero = Number(busca.replace(/^(#|ch-?)/i, ""));

    let filtrados = escopo.filter((c) => {
      if (status.length && !status.includes(c.status)) return false;
      if (prioridades.length && !prioridades.includes(c.prioridade)) return false;
      if (params.responsavel === "eu" && c.responsavel_id !== eu.id) return false;
      if (params.responsavel === "nenhum" && c.responsavel_id !== null) return false;
      if (Number(params.responsavel) > 0 && c.responsavel_id !== Number(params.responsavel)) return false;
      if (busca) {
        const casa = c.titulo.toLowerCase().includes(busca) || c.descricao.toLowerCase().includes(busca)
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
    };
    filtrados = [...filtrados].sort(ordens[params.ordem] || ordens.recentes);

    const porPagina = Math.min(50, Math.max(1, parseInt(params.porPagina, 10) || 15));
    const pagina = Math.max(1, parseInt(params.pagina, 10) || 1);
    const pendente = (c) => c.status !== "resolvido";

    return [200, {
      dados: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina).map(comPessoas),
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
      },
    }];
  }],

  ["POST", /^\/chamados$/, ({ eu, corpo }) => {
    const titulo = texto(corpo.titulo);
    const descricao = texto(corpo.descricao);
    if (titulo.length < 3) falhar(400, "Informe um título (mínimo 3 caracteres).");
    if (titulo.length > 255) falhar(400, "O título deve ter no máximo 255 caracteres.");
    if (!descricao) falhar(400, "Descreva o problema.");
    const prioridade = corpo.prioridade || "media";
    if (!PRIORIDADES.includes(prioridade)) falhar(400, `Prioridade inválida. Use: ${PRIORIDADES.join(", ")}.`);
    const quando = agora();
    const chamado = {
      id: proximoId("chamados"), titulo, descricao, status: "aberto", prioridade,
      usuario_id: eu.id, responsavel_id: null, resolvido_em: null, createdAt: quando, updatedAt: quando,
    };
    banco().chamados.push(chamado);
    return [201, chamado];
  }],

  ["GET", /^\/chamados\/([^/]+)$/, ({ eu, m }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const db = banco();
    const interacoes = db.interacoes
      .filter((i) => i.chamado_id === chamado.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id)
      .map((i) => {
        const autor = usuarioPorId(i.usuario_id);
        return { ...i, usuario: autor ? { id: autor.id, nome: autor.nome, perfil: autor.perfil } : null };
      });
    const anexos = db.anexos
      .filter((a) => a.chamado_id === chamado.id)
      .map(({ id, nome_original, createdAt }) => ({ id, nome_original, createdAt }));
    return [200, { ...comPessoas(chamado), interacoes, anexos }];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/status$/, ({ eu, m, corpo }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const { status } = corpo;
    if (!STATUS.includes(status)) falhar(400, `Status inválido. Use: ${STATUS.join(", ")}.`);
    if (!isEquipe(eu) && !["aberto", "resolvido"].includes(status)) {
      falhar(403, "Apenas a equipe de suporte pode colocar o chamado em andamento.");
    }
    if (status === chamado.status) return [200, chamado];
    const anterior = chamado.status;
    chamado.status = status;
    chamado.resolvido_em = status === "resolvido" ? agora() : null;
    const assumiu = status === "em andamento" && isEquipe(eu) && !chamado.responsavel_id;
    if (assumiu) chamado.responsavel_id = eu.id;
    tocar(chamado);
    registrarEvento(chamado, eu, `alterou o status de "${anterior}" para "${status}"`);
    if (assumiu) registrarEvento(chamado, eu, "assumiu o chamado");
    return [200, chamado];
  }],

  ["PUT", /^\/chamados\/([^/]+)\/prioridade$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "suporte", "admin");
    const chamado = chamadoComAcesso(m[1], eu);
    const { prioridade } = corpo;
    if (!PRIORIDADES.includes(prioridade)) falhar(400, `Prioridade inválida. Use: ${PRIORIDADES.join(", ")}.`);
    if (prioridade !== chamado.prioridade) {
      const anterior = chamado.prioridade;
      chamado.prioridade = prioridade;
      tocar(chamado);
      registrarEvento(chamado, eu, `alterou a prioridade de ${ROTULO_PRIORIDADE[anterior]} para ${ROTULO_PRIORIDADE[prioridade]}`);
    }
    return [200, chamado];
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
    if (novoId === chamado.responsavel_id) return [200, chamado];
    chamado.responsavel_id = novoId;
    tocar(chamado);
    let mensagem = "removeu o responsável do chamado";
    if (responsavel) mensagem = responsavel.id === eu.id ? "assumiu o chamado" : `atribuiu o chamado a ${responsavel.nome}`;
    registrarEvento(chamado, eu, mensagem);
    return [200, chamado];
  }],

  ["POST", /^\/chamados\/([^/]+)\/interacoes$/, ({ eu, m, corpo }) => {
    const chamado = chamadoComAcesso(m[1], eu);
    const mensagem = texto(corpo.mensagem);
    if (!mensagem) falhar(400, "A mensagem não pode ficar vazia.");
    const quando = agora();
    const interacao = {
      id: proximoId("interacoes"), chamado_id: chamado.id, usuario_id: eu.id,
      mensagem, tipo: "mensagem", createdAt: quando, updatedAt: quando,
    };
    banco().interacoes.push(interacao);
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
      .map(({ id, nome, perfil }) => ({ id, nome, perfil }));
    return [200, membros];
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
        ...publico(u), ativo: u.ativo, createdAt: u.createdAt,
        total_chamados: chamados.filter((c) => c.usuario_id === u.id).length,
      }))];
  }],

  ["POST", /^\/usuarios$/, ({ eu, corpo }) => {
    exigirPerfil(eu, "admin");
    const erro = erroDeCadastro(corpo);
    if (erro) falhar(400, erro);
    const perfil = corpo.perfil || "comum";
    if (!PERFIS.includes(perfil)) falhar(400, `Perfil inválido. Use: ${PERFIS.join(", ")}.`);
    const email = texto(corpo.email).toLowerCase();
    if (banco().usuarios.some((u) => u.email === email)) falhar(409, "Este e-mail já está cadastrado.");
    const usuario = {
      id: proximoId("usuarios"), nome: texto(corpo.nome), email, perfil,
      ativo: true, senha: corpo.senha, createdAt: agora(),
    };
    banco().usuarios.push(usuario);
    return [201, { ...publico(usuario), ativo: true, createdAt: usuario.createdAt, total_chamados: 0 }];
  }],

  ["PUT", /^\/usuarios\/([^/]+)\/perfil$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    if (!PERFIS.includes(corpo.perfil)) falhar(400, `Perfil inválido. Use: ${PERFIS.join(", ")}.`);
    const usuario = usuarioPorId(Number(m[1]));
    if (!usuario) falhar(404, "Usuário não encontrado.");
    if (usuario.id === eu.id && corpo.perfil !== "admin") falhar(400, "Você não pode remover o seu próprio perfil de admin.");
    usuario.perfil = corpo.perfil;
    return [200, { ...publico(usuario), ativo: usuario.ativo, createdAt: usuario.createdAt }];
  }],

  ["PUT", /^\/usuarios\/([^/]+)\/status$/, ({ eu, m, corpo }) => {
    exigirPerfil(eu, "admin");
    if (typeof corpo.ativo !== "boolean") falhar(400, 'Informe "ativo" como true ou false.');
    const usuario = usuarioPorId(Number(m[1]));
    if (!usuario) falhar(404, "Usuário não encontrado.");
    if (usuario.id === eu.id && !corpo.ativo) falhar(400, "Você não pode desativar a sua própria conta.");
    usuario.ativo = corpo.ativo;
    return [200, { ...publico(usuario), ativo: usuario.ativo, createdAt: usuario.createdAt }];
  }],
];

// Rotas que não exigem login
const PUBLICAS = ["/register", "/login"];

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

  return {
    chamados: {
      total: chamados.length,
      porStatus: contar(chamados, "status", STATUS),
      pendentesPorPrioridade: contar(pendentes, "prioridade", PRIORIDADES),
      semResponsavel: pendentes.filter((c) => c.responsavel_id === null).length,
    },
    resolucao: { periodoDias: 30, resolvidos: resolvidos30.length, horasMedias: media(resolvidos30) },
    porDia,
    equipe: ativos
      .filter(isEquipe)
      .map((u) => {
        const resolvidos = resolvidos30.filter((c) => c.responsavel_id === u.id);
        return {
          id: u.id, nome: u.nome, perfil: u.perfil,
          pendentes: pendentes.filter((c) => c.responsavel_id === u.id).length,
          resolvidos: resolvidos.length,
          horasMedias: media(resolvidos),
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
      .map(comPessoas),
  };
}

/* ----------------------------- Adaptador ----------------------------- */

export default async function adaptadorDemo(config) {
  // Pequena espera para parecer uma rede de verdade (e mostrar os carregamentos)
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

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
