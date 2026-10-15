// src/demo/banco.js
// "Banco de dados" da demonstração: vive no localStorage do navegador de
// quem está visitando. Cada visitante tem a sua própria cópia, então nada
// do que um faz aparece para outro.

import { catalogoInicial } from "./catalogo";

// Mudar a versão descarta dados antigos salvos no navegador de quem já visitou
const CHAVE = "@NexoDesk:demo:v4";
const HORA = 60 * 60 * 1000;

let cache = null;

export function banco() {
  if (cache) return cache;
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) {
      cache = JSON.parse(salvo);
      return cache;
    }
  } catch {
    // localStorage indisponível ou corrompido: recomeça com os dados de exemplo
  }
  cache = dadosIniciais();
  salvar();
  return cache;
}

// Devolve false se o navegador recusar (ex.: espaço esgotado)
export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

export function restaurarDadosDeExemplo() {
  cache = dadosIniciais();
  salvar();
}

export function proximoId(tabela) {
  const db = banco();
  db.sequencias[tabela] = (db.sequencias[tabela] || 0) + 1;
  return db.sequencias[tabela];
}

/* ------------------------- Dados de exemplo ------------------------- */
// Mesmo conteúdo do seeder do backend, com datas relativas a hoje.

const USUARIOS = [
  { chave: 'admin', nome: 'Marina Alves', email: 'admin@helpdesk.com', perfil: 'admin', setor: 'Tecnologia da Informação', cargo: 'Coordenadora de TI', ramal: '2001', localizacao: 'Sede · 3º andar' },
  { chave: 'rafael', nome: 'Rafael Costa', email: 'suporte@helpdesk.com', perfil: 'suporte', setor: 'Tecnologia da Informação', cargo: 'Analista de Suporte', ramal: '2010', localizacao: 'Sede · 3º andar' },
  { chave: 'carlos', nome: 'Carlos Lima', email: 'carlos@helpdesk.com', perfil: 'suporte', setor: 'Tecnologia da Informação', cargo: 'Técnico de Suporte', ramal: '2011', localizacao: 'Sede · 3º andar' },
  { chave: 'lucas', nome: 'Lucas Pereira', email: 'usuario@helpdesk.com', perfil: 'comum', setor: 'Financeiro', cargo: 'Analista Financeiro', ramal: '2034', localizacao: 'Sede · 2º andar' },
  { chave: 'juliana', nome: 'Juliana Rocha', email: 'juliana@helpdesk.com', perfil: 'comum', setor: 'Recursos Humanos', cargo: 'Analista de RH', ramal: '2045', localizacao: 'Sede · 1º andar' },
  { chave: 'pedro', nome: 'Pedro Santos', email: 'pedro@helpdesk.com', perfil: 'comum', setor: 'Comercial', cargo: 'Gerente Comercial', ramal: '2050', localizacao: 'Filial Centro' },
  // Conta desativada, para demonstrar o recurso na tela de administração
  { chave: 'ana', nome: 'Ana Souza', email: 'ana@helpdesk.com', perfil: 'comum', ativo: false, setor: 'Comercial', cargo: 'Vendedora', ramal: null, localizacao: 'Filial Centro' },
];

// Membros dos grupos técnicos (iguais ao seeder)
const MEMBROS_GRUPOS = {
  "Service Desk (N1)": ["rafael", "carlos"],
  "Infraestrutura (N2)": ["rafael"],
  "Sistemas (N2)": ["carlos"],
};

const CHAMADOS = [
  { titulo: 'Impressora do 2º andar não imprime', descricao: 'A impressora HP do 2º andar aparece como offline para todos do setor financeiro desde hoje cedo.', de: 'lucas', categoria: 'Hardware › Impressora', status: 'aberto', respostas: { qual_impressora: 'HP LaserJet do 2º andar', problema: 'Não imprime' }, dias: 0.2 },
  { titulo: 'Sem acesso à VPN', descricao: 'Ao conectar na VPN de casa, recebo a mensagem "falha na autenticação". A senha de rede está correta.', de: 'lucas', categoria: 'Rede e internet › VPN', status: 'em andamento', resp: 'rafael', dias: 0.7,
    conversa: [['rafael', 'Olá, Lucas! Pode confirmar se o problema acontece também na rede do escritório?'], ['lucas', 'No escritório funciona normalmente, só de casa que falha.'], ['rafael', 'Obrigado. Vou verificar o certificado da VPN no seu usuário e te retorno.']] },
  { titulo: 'Computador reiniciando sozinho', descricao: 'O desktop reinicia sem aviso várias vezes ao dia, principalmente ao abrir planilhas grandes.', de: 'juliana', categoria: 'Hardware › Computador ou notebook', status: 'em andamento', resp: 'carlos', respostas: { tipo_de_equipamento: 'Desktop', o_que_esta_acontecendo: 'Reinicia sozinho', numero_de_patrimonio: 'PAT-00871' }, dias: 2,
    conversa: [['carlos', 'Juliana, vou passar na sua mesa às 14h para verificar a fonte e a temperatura do equipamento.']] },
  { titulo: 'Instalação do Power BI Desktop', descricao: 'Preciso do Power BI Desktop instalado para montar os relatórios do trimestre.', de: 'pedro', categoria: 'Software e sistemas › Instalação de programa', status: 'aberto', respostas: { programa: 'Power BI Desktop', para_que_vai_usar: 'Relatórios trimestrais do comercial' }, dias: 0.5 },
  { titulo: 'Backup noturno não executado', descricao: 'O relatório de backup de hoje indica falha na rotina do servidor de arquivos.', de: 'pedro', categoria: 'Software e sistemas › Backup e servidores', status: 'em andamento', resp: 'rafael', respostas: { pasta_ou_servidor: 'SRV-ARQUIVOS01' }, dias: 0.13,
    conversa: [['rafael', 'Já estou verificando os logs da rotina de backup no servidor.']] },
  { titulo: 'Telefone IP sem sinal', descricao: 'O ramal 2045 está mudo desde a mudança de mesa.', de: 'juliana', categoria: 'Rede e internet › Telefone IP', status: 'aberto', respostas: { ramal_com_problema: '2045' }, dias: 1.5 },
  { titulo: 'E-mail não sincroniza no celular', descricao: 'O Outlook do celular parou de receber e-mails desde ontem.', de: 'juliana', categoria: 'E-mail › Configuração de e-mail', status: 'resolvido', resp: 'rafael', dias: 3, resolveuEm: 5 },
  { titulo: 'Sistema ERP fora do ar', descricao: 'Ninguém do comercial consegue acessar o ERP. Erro 503 na tela de login.', de: 'pedro', categoria: 'Software e sistemas › Sistema fora do ar', status: 'resolvido', resp: 'carlos', respostas: { sistema: 'ERP', quem_esta_sem_acesso: 'Meu setor', mensagem_de_erro: '503 Service Unavailable' }, dias: 4, resolveuEm: 2 },
  { titulo: 'Troca da senha do Wi-Fi de visitantes', descricao: 'A senha do Wi-Fi de visitantes precisa ser trocada para o evento de sexta.', de: 'lucas', categoria: 'Rede e internet › Wi-Fi', status: 'resolvido', resp: 'rafael', dias: 5, resolveuEm: 24 },
  { titulo: 'Monitor piscando', descricao: 'O monitor secundário pisca a cada poucos minutos.', de: 'juliana', categoria: 'Hardware › Monitor e vídeo', status: 'resolvido', resp: 'carlos', dias: 6, resolveuEm: 30 },
  { titulo: 'Acesso à pasta do financeiro', descricao: 'Preciso de acesso de leitura à pasta compartilhada do financeiro.', de: 'pedro', categoria: 'Acessos e senhas › Permissão em pasta ou sistema', status: 'resolvido', resp: 'rafael', dias: 7, resolveuEm: 3 },
  { titulo: 'Teclado com teclas falhando', descricao: 'As teclas A e S do teclado não respondem.', de: 'lucas', categoria: 'Hardware › Teclado, mouse e webcam', status: 'resolvido', resp: 'carlos', dias: 8, resolveuEm: 30 },
  { titulo: 'Lentidão no servidor de arquivos', descricao: 'Abrir arquivos da rede está levando mais de um minuto.', de: 'juliana', categoria: 'Rede e internet › Lentidão ou queda de rede', status: 'resolvido', resp: 'rafael', dias: 9, resolveuEm: 11, respondeuEm: 3 },
  { titulo: 'Criar usuário para novo colaborador', descricao: 'O novo analista começa na segunda e precisa de usuário de rede e e-mail.', de: 'pedro', categoria: 'Acessos e senhas › Criar ou desativar usuário', status: 'resolvido', resp: 'carlos', dias: 10, resolveuEm: 6 },
  { titulo: 'Antivírus bloqueando sistema interno', descricao: 'O antivírus está colocando o executável do sistema de ponto em quarentena.', de: 'lucas', categoria: 'Software e sistemas › Antivírus e segurança', status: 'resolvido', resp: 'rafael', dias: 11, resolveuEm: 4 },
  { titulo: 'Webcam não funciona no Teams', descricao: 'A webcam aparece como "em uso por outro aplicativo" nas reuniões.', de: 'juliana', categoria: 'Hardware › Teclado, mouse e webcam', status: 'resolvido', resp: 'carlos', dias: 12, resolveuEm: 26 },
  { titulo: 'Licença do Office expirada', descricao: 'O Word abre em modo somente leitura informando licença expirada.', de: 'lucas', categoria: 'Software e sistemas › Licenças', status: 'resolvido', resp: 'carlos', dias: 13, resolveuEm: 2 },
];

function dadosIniciais() {
  const agora = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const { grupos, categorias } = catalogoInicial(iso(agora));
  const db = {
    usuarios: [],
    grupos,
    usuarios_grupos: [],
    categorias,
    chamados: [],
    interacoes: [],
    anexos: [],
    sequencias: {
      usuarios: 0, chamados: 0, interacoes: 0, anexos: 0, grupos: grupos.length, categorias: categorias.length,
    },
  };
  const novoId = (tabela) => (db.sequencias[tabela] += 1);
  const id = {};

  USUARIOS.forEach((u) => {
    const usuario = {
      id: novoId("usuarios"),
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      setor: u.setor ?? null,
      cargo: u.cargo ?? null,
      ramal: u.ramal ?? null,
      localizacao: u.localizacao ?? null,
      ativo: u.ativo !== false,
      senha: "123456",
      createdAt: iso(agora - 30 * 24 * HORA),
    };
    id[u.chave] = usuario.id;
    db.usuarios.push(usuario);
  });

  grupos.forEach((g) => {
    (MEMBROS_GRUPOS[g.nome] || []).forEach((chave) => db.usuarios_grupos.push({ usuario_id: id[chave], grupo_id: g.id }));
  });

  // "Hardware › Impressora" -> subcategoria
  const subPorCaminho = Object.fromEntries(categorias
    .filter((c) => c.parent_id !== null)
    .map((s) => [`${categorias.find((p) => p.id === s.parent_id).nome} › ${s.nome}`, s]));

  CHAMADOS.forEach((c) => {
    const sub = subPorCaminho[c.categoria];
    const autor = USUARIOS.find((u) => u.chave === c.de);
    const respostas = sub.campos
      .filter((campo) => c.respostas?.[campo.chave])
      .map((campo) => ({ chave: campo.chave, rotulo: campo.rotulo, valor: c.respostas[campo.chave] }));
    const abertoEm = agora - c.dias * 24 * HORA;
    const resolvidoEm = c.resolveuEm ? abertoEm + c.resolveuEm * HORA : null;
    const MIN = 60 * 1000;

    // Timeline: técnico assume, responde, conversa e (se for o caso) resolve
    const timeline = [];
    if (c.resp) {
      const assumiuEm = abertoEm + 20 * MIN;
      timeline.push(["evento", c.resp, 'alterou o status de "aberto" para "em andamento"', assumiuEm]);
      timeline.push(["evento", c.resp, "assumiu o chamado", assumiuEm + 1000]);
      if (c.conversa) {
        c.conversa.forEach(([autor, mensagem], i) => timeline.push(["mensagem", autor, mensagem, assumiuEm + (i + 1) * 20 * MIN]));
      } else {
        const respondeuEm = abertoEm + (c.respondeuEm ? c.respondeuEm * HORA : 30 * MIN);
        timeline.push(["mensagem", c.resp, "Recebido! Já estou verificando.", respondeuEm]);
      }
    }
    if (resolvidoEm) {
      timeline.push(["mensagem", c.resp, "Problema resolvido. Pode confirmar se está tudo certo por aí?", resolvidoEm - 1000]);
      timeline.push(["evento", c.resp, 'alterou o status de "em andamento" para "resolvido"', resolvidoEm]);
    }
    const primeiraResposta = timeline.find(([tipo, autor]) => tipo === "mensagem" && autor === c.resp);

    const chamado = {
      id: novoId("chamados"),
      titulo: c.titulo,
      descricao: c.descricao,
      status: c.status,
      prioridade: sub.prioridade,
      contato: autor.ramal,
      local: autor.localizacao,
      respostas,
      categoria_id: sub.id,
      grupo_id: sub.grupo_id,
      usuario_id: id[c.de],
      responsavel_id: c.resp ? id[c.resp] : null,
      prazo_resposta: iso(abertoEm + sub.sla_resposta_horas * HORA),
      prazo_solucao: iso(abertoEm + sub.sla_solucao_horas * HORA),
      resolvido_em: resolvidoEm ? iso(resolvidoEm) : null,
      primeira_resposta_em: primeiraResposta ? iso(primeiraResposta[3]) : null,
      createdAt: iso(abertoEm),
      updatedAt: iso(resolvidoEm || (c.resp ? abertoEm + 20 * MIN : abertoEm)),
    };
    db.chamados.push(chamado);

    timeline.forEach(([tipo, autor, mensagem, em]) => {
      db.interacoes.push({
        id: novoId("interacoes"),
        chamado_id: chamado.id,
        usuario_id: id[autor],
        mensagem,
        tipo,
        createdAt: iso(em),
        updatedAt: iso(em),
      });
    });
  });

  return db;
}
