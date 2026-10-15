// src/database/catalogoPadrao.js
// Grupos técnicos e catálogo de categorias que o sistema traz de fábrica.
// São dados de referência (não de demonstração): o admin edita tudo depois
// pela tela de administração. Usado pela migration do catálogo e pelos testes.
//
// Cada subcategoria define a prioridade, os prazos (em horas) e o grupo que
// recebe o chamado. Sem prazo explícito, vale a meta padrão da prioridade.

const { METAS_SLA } = require('../config/perfis');

const GRUPOS = [
  { chave: 'n1', nome: 'Service Desk (N1)', descricao: 'Primeiro atendimento: triagem, acessos, equipamentos e dúvidas' },
  { chave: 'infra', nome: 'Infraestrutura (N2)', descricao: 'Rede, servidores, backup, telefonia e segurança' },
  { chave: 'sistemas', nome: 'Sistemas (N2)', descricao: 'ERP e sistemas internos' },
];

const CATALOGO = [
  {
    nome: 'Hardware', icone: 'hardware', grupo: 'n1', descricao: 'Computador, impressora, monitor e periféricos',
    subcategorias: [
      { nome: 'Computador ou notebook', prioridade: 'alta', descricao: 'Não liga, reinicia sozinho, está lento ou com defeito' },
      { nome: 'Impressora', prioridade: 'alta', descricao: 'Não imprime, atola papel ou está sem toner' },
      { nome: 'Monitor e vídeo', prioridade: 'media' },
      { nome: 'Teclado, mouse e webcam', prioridade: 'baixa' },
      { nome: 'Outros', prioridade: 'media' },
    ],
  },
  {
    nome: 'Software e sistemas', icone: 'software', grupo: 'n1', descricao: 'Programas, sistemas internos e licenças',
    subcategorias: [
      { nome: 'Sistema fora do ar', prioridade: 'critica', grupo: 'sistemas', descricao: 'ERP ou sistema interno indisponível' },
      { nome: 'Backup e servidores', prioridade: 'critica', grupo: 'infra' },
      { nome: 'Antivírus e segurança', prioridade: 'alta', grupo: 'infra' },
      { nome: 'Licenças', prioridade: 'media' },
      { nome: 'Instalação de programa', prioridade: 'baixa' },
      { nome: 'Outros', prioridade: 'media' },
    ],
  },
  {
    nome: 'Rede e internet', icone: 'rede', grupo: 'infra', descricao: 'Internet, VPN, Wi-Fi e telefonia',
    subcategorias: [
      { nome: 'Lentidão ou queda de rede', prioridade: 'alta' },
      { nome: 'VPN', prioridade: 'media' },
      { nome: 'Telefone IP', prioridade: 'media' },
      { nome: 'Wi-Fi', prioridade: 'baixa' },
      { nome: 'Outros', prioridade: 'media' },
    ],
  },
  {
    nome: 'Acessos e senhas', icone: 'acessos', grupo: 'n1', descricao: 'Senhas, permissões e usuários',
    subcategorias: [
      // Prazo próprio, mais curto que o padrão da prioridade alta: senha bloqueada para o trabalho
      { nome: 'Redefinir senha', prioridade: 'alta', slaResposta: 0.5, slaSolucao: 2, descricao: 'Senha expirada ou conta bloqueada' },
      { nome: 'Permissão em pasta ou sistema', prioridade: 'media' },
      { nome: 'Criar ou desativar usuário', prioridade: 'media' },
      { nome: 'Outros', prioridade: 'media' },
    ],
  },
  {
    nome: 'E-mail', icone: 'email', grupo: 'n1', descricao: 'Caixa de entrada, Outlook e envio',
    subcategorias: [
      { nome: 'Configuração de e-mail', prioridade: 'media' },
      { nome: 'Outros', prioridade: 'media' },
    ],
  },
  {
    nome: 'Outros', icone: 'outros', grupo: 'n1', descricao: 'Qualquer outro assunto',
    subcategorias: [{ nome: 'Outros assuntos', prioridade: 'media' }],
  },
];

// Detalhes do formulário de cada subcategoria ("Categoria › Subcategoria"):
// - palavras: termos e sinônimos que a busca inteligente reconhece
// - sugestoes: títulos comuns, oferecidos ao preencher o assunto
// - modelo: roteiro para a descrição (vazio = modelo genérico)
// - campos: perguntas específicas (tipo texto, numero ou selecao)
const sel = (rotulo, opcoes, extra = {}) => ({ rotulo, tipo: 'selecao', opcoes, obrigatorio: true, ...extra });
const txt = (rotulo, extra = {}) => ({ rotulo, tipo: 'texto', obrigatorio: false, ...extra });

const DETALHES_CATALOGO = {
  'Hardware › Computador ou notebook': {
    palavras: ['pc', 'computador', 'notebook', 'maquina', 'desktop', 'cpu', 'lento', 'travando', 'nao liga', 'tela azul', 'reiniciando', 'bateria', 'carregador', 'barulho'],
    sugestoes: ['Computador não liga', 'Computador muito lento', 'Computador reiniciando sozinho', 'Notebook não carrega a bateria'],
    campos: [
      sel('Tipo de equipamento', ['Desktop', 'Notebook']),
      sel('O que está acontecendo', ['Não liga', 'Lento ou travando', 'Reinicia sozinho', 'Tela azul', 'Outro']),
      txt('Número de patrimônio', { ajuda: 'Etiqueta colada no equipamento, se houver' }),
    ],
  },
  'Hardware › Impressora': {
    palavras: ['impressora', 'imprimir', 'impressao', 'toner', 'papel', 'atolado', 'atolando', 'scanner', 'digitalizar', 'xerox', 'copiadora', 'cartucho'],
    sugestoes: ['Impressora não imprime', 'Impressora atolando papel', 'Toner da impressora acabou', 'Scanner não digitaliza'],
    campos: [
      txt('Qual impressora', { obrigatorio: true, ajuda: 'Modelo ou onde ela fica. Ex.: HP do 2º andar' }),
      sel('Problema', ['Não imprime', 'Atolando papel', 'Sem toner', 'Impressão falhada ou manchada', 'Scanner', 'Outro']),
    ],
  },
  'Hardware › Monitor e vídeo': {
    palavras: ['monitor', 'tela', 'video', 'imagem', 'hdmi', 'piscando', 'sem sinal', 'segunda tela', 'projetor', 'resolucao'],
    sugestoes: ['Monitor sem sinal', 'Monitor piscando', 'Segunda tela não é reconhecida'],
    campos: [txt('Número de patrimônio', { ajuda: 'Etiqueta colada no monitor, se houver' })],
  },
  'Hardware › Teclado, mouse e webcam': {
    palavras: ['teclado', 'mouse', 'webcam', 'camera', 'headset', 'fone', 'microfone', 'periferico', 'tecla', 'audio', 'som'],
    sugestoes: ['Mouse parou de funcionar', 'Teclado com teclas falhando', 'Webcam não funciona nas reuniões', 'Headset sem áudio'],
    campos: [sel('Equipamento', ['Teclado', 'Mouse', 'Webcam', 'Headset ou fone', 'Outro'])],
  },
  'Hardware › Outros': {
    palavras: ['equipamento', 'hardware', 'peca', 'cabo', 'estabilizador', 'nobreak'],
    sugestoes: ['Solicitação de equipamento', 'Problema em equipamento'],
  },
  'Software e sistemas › Sistema fora do ar': {
    palavras: ['sistema', 'fora do ar', 'erp', 'caiu', 'indisponivel', 'erro 503', 'nao abre', 'nao carrega', 'ponto', 'intranet', 'totvs', 'sap'],
    sugestoes: ['ERP fora do ar', 'Sistema não abre', 'Erro ao entrar no sistema', 'Sistema de ponto indisponível'],
    modelo: 'Mensagem de erro exibida:\n\nHorário em que começou:\n\nO que você estava fazendo:\n',
    campos: [
      sel('Sistema', ['ERP', 'Sistema de ponto', 'Intranet', 'Outro']),
      sel('Quem está sem acesso', ['Só eu', 'Meu setor', 'Vários setores']),
      txt('Mensagem de erro', { ajuda: 'Copie o texto da tela, se houver' }),
    ],
  },
  'Software e sistemas › Backup e servidores': {
    palavras: ['backup', 'servidor', 'rotina', 'restaurar', 'arquivo apagado', 'recuperar', 'pasta de rede', 'storage', 'versao anterior'],
    sugestoes: ['Recuperar arquivo apagado da rede', 'Falha na rotina de backup', 'Servidor de arquivos inacessível'],
    campos: [txt('Pasta ou servidor', { ajuda: 'Ex.: \\\\servidor\\financeiro' })],
  },
  'Software e sistemas › Antivírus e segurança': {
    palavras: ['virus', 'antivirus', 'malware', 'phishing', 'email suspeito', 'link suspeito', 'quarentena', 'bloqueado', 'ransomware', 'invasao', 'golpe', 'hacker'],
    sugestoes: ['Recebi um e-mail suspeito', 'Antivírus bloqueando programa', 'Computador com vírus'],
    modelo: 'Remetente, site ou programa suspeito:\n\nO que você fez (clicou, baixou, digitou senha):\n\nQuando aconteceu:\n',
    campos: [sel('Você clicou em algum link ou abriu anexo?', ['Sim', 'Não', 'Não sei'])],
  },
  'Software e sistemas › Licenças': {
    palavras: ['licenca', 'office', 'word', 'excel', 'powerpoint', 'ativacao', 'expirada', 'somente leitura', 'chave', 'adobe', 'acrobat'],
    sugestoes: ['Licença do Office expirada', 'Programa pedindo ativação', 'Word em modo somente leitura'],
    campos: [txt('Programa', { obrigatorio: true, ajuda: 'Ex.: Microsoft Office, Adobe Acrobat' })],
  },
  'Software e sistemas › Instalação de programa': {
    palavras: ['instalar', 'instalacao', 'programa', 'software', 'aplicativo', 'power bi', 'baixar', 'download', 'atualizar', 'atualizacao'],
    sugestoes: ['Instalação de programa', 'Atualizar programa', 'Instalação do Power BI'],
    campos: [
      txt('Programa', { obrigatorio: true }),
      txt('Para que vai usar', { obrigatorio: true, ajuda: 'Ajuda a equipe a aprovar a instalação' }),
    ],
  },
  'Software e sistemas › Outros': {
    palavras: ['duvida', 'programa', 'configurar', 'erro'],
    sugestoes: ['Dúvida sobre programa', 'Erro em programa'],
  },
  'Rede e internet › Lentidão ou queda de rede': {
    palavras: ['internet', 'rede', 'lento', 'lentidao', 'caiu', 'sem internet', 'conexao', 'cabo de rede', 'queda', 'oscilando', 'desconectando'],
    sugestoes: ['Internet lenta', 'Sem acesso à internet', 'Rede caindo várias vezes'],
    campos: [sel('Onde acontece', ['Só no meu computador', 'No meu setor', 'Na empresa toda'])],
  },
  'Rede e internet › VPN': {
    palavras: ['vpn', 'acesso remoto', 'home office', 'trabalho remoto', 'forticlient', 'conectar de casa', 'certificado'],
    sugestoes: ['Não consigo conectar na VPN', 'VPN desconectando', 'Acesso remoto ao computador do escritório'],
    campos: [sel('De onde você está conectando', ['Casa', 'Outra unidade', 'Viagem'], { obrigatorio: false })],
  },
  'Rede e internet › Telefone IP': {
    palavras: ['telefone', 'ramal', 'ligacao', 'mudo', 'sem sinal', 'voip', 'aparelho', 'chamada', 'transferir ligacao'],
    sugestoes: ['Telefone sem sinal', 'Ramal não recebe ligações', 'Configurar ramal na nova mesa'],
    campos: [txt('Ramal com problema', { obrigatorio: true })],
  },
  'Rede e internet › Wi-Fi': {
    palavras: ['wifi', 'wireless', 'sem fio', 'sinal fraco', 'senha do wifi', 'visitantes', 'roteador'],
    sugestoes: ['Wi-Fi sem sinal', 'Senha do Wi-Fi de visitantes', 'Wi-Fi caindo'],
    campos: [sel('Rede', ['Corporativa', 'Visitantes'], { obrigatorio: false })],
  },
  'Rede e internet › Outros': {
    palavras: ['rede', 'ponto de rede', 'switch', 'cabeamento'],
    sugestoes: ['Instalar ponto de rede', 'Problema de rede'],
  },
  'Acessos e senhas › Redefinir senha': {
    palavras: ['senha', 'esqueci', 'bloqueado', 'bloqueada', 'expirada', 'resetar', 'redefinir', 'desbloquear', 'conta', 'login', 'trocar senha'],
    sugestoes: ['Redefinir senha de rede', 'Conta bloqueada', 'Senha expirada'],
    campos: [
      sel('Senha de qual sistema', ['Rede/Windows', 'E-mail', 'ERP', 'Outro']),
      txt('Usuário de login', { ajuda: 'Se for diferente do seu e-mail' }),
    ],
  },
  'Acessos e senhas › Permissão em pasta ou sistema': {
    palavras: ['permissao', 'acesso', 'pasta', 'compartilhada', 'liberar', 'acesso negado', 'autorizacao', 'perfil de acesso'],
    sugestoes: ['Acesso à pasta compartilhada', 'Liberar acesso ao sistema', 'Acesso negado em pasta'],
    campos: [
      txt('Pasta ou sistema', { obrigatorio: true }),
      sel('Tipo de acesso', ['Somente leitura', 'Leitura e escrita']),
      txt('Gestor que aprova', { ajuda: 'Quem autoriza o acesso' }),
    ],
  },
  'Acessos e senhas › Criar ou desativar usuário': {
    palavras: ['novo colaborador', 'admissao', 'contratacao', 'desligamento', 'demissao', 'criar usuario', 'desativar usuario', 'conta nova', 'onboarding'],
    sugestoes: ['Criar usuário para novo colaborador', 'Desativar usuário de colaborador desligado'],
    campos: [
      sel('Ação', ['Criar usuário', 'Desativar usuário']),
      txt('Nome do colaborador', { obrigatorio: true }),
      txt('Data de início ou desligamento'),
    ],
  },
  'Acessos e senhas › Outros': {
    palavras: ['acesso', 'usuario', 'cracha', 'biometria'],
    sugestoes: ['Problema de acesso'],
  },
  'E-mail › Configuração de e-mail': {
    palavras: ['email', 'outlook', 'caixa de entrada', 'sincronizar', 'sincroniza', 'celular', 'assinatura', 'nao recebe', 'nao envia', 'spam', 'caixa cheia', 'webmail'],
    sugestoes: ['Outlook não sincroniza', 'Não estou recebendo e-mails', 'Caixa de e-mail cheia', 'Configurar e-mail no celular'],
    campos: [sel('Onde', ['Computador (Outlook)', 'Celular', 'Webmail'], { obrigatorio: false })],
  },
  'E-mail › Outros': {
    palavras: ['email', 'lista de distribuicao', 'grupo de email', 'calendario'],
    sugestoes: ['Criar lista de e-mail', 'Problema no calendário do Outlook'],
  },
  'Outros › Outros assuntos': {
    palavras: ['duvida', 'outro', 'ajuda', 'solicitacao'],
    sugestoes: ['Dúvida geral', 'Solicitação diversa'],
  },
};

// Categoria antiga (texto) -> subcategoria nova, usado na conversão de dados
const CONVERSAO_CATEGORIA_ANTIGA = {
  hardware: 'Hardware › Outros',
  software: 'Software e sistemas › Outros',
  rede: 'Rede e internet › Outros',
  acessos: 'Acessos e senhas › Outros',
  email: 'E-mail › Outros',
  outros: 'Outros › Outros assuntos',
};

// Insere grupos e catálogo. Devolve os IDs:
// { grupos: { n1: 1, ... }, subcategorias: { 'Hardware › Impressora': 9, ... } }
async function inserirCatalogoPadrao(queryInterface) {
  const sql = (texto, replacements) => queryInterface.sequelize.query(texto, { replacements, type: 'SELECT' });
  const executar = (texto, replacements) => queryInterface.sequelize.query(texto, { replacements });
  const agora = new Date();

  const grupos = {};
  for (const g of GRUPOS) {
    await executar(
      'INSERT INTO grupos (nome, descricao, ativo, created_at, updated_at) VALUES (:nome, :descricao, 1, :agora, :agora)',
      { nome: g.nome, descricao: g.descricao, agora }
    );
    const [linha] = await sql('SELECT id FROM grupos WHERE nome = :nome', { nome: g.nome });
    grupos[g.chave] = linha.id;
  }

  const subcategorias = {};
  for (const c of CATALOGO) {
    await executar(
      `INSERT INTO categorias (nome, descricao, icone, parent_id, grupo_id, ativo, created_at, updated_at)
       VALUES (:nome, :descricao, :icone, NULL, :grupo, 1, :agora, :agora)`,
      { nome: c.nome, descricao: c.descricao || null, icone: c.icone, grupo: grupos[c.grupo], agora }
    );
    const [pai] = await sql('SELECT id FROM categorias WHERE nome = :nome AND parent_id IS NULL', { nome: c.nome });

    for (const s of c.subcategorias) {
      const meta = METAS_SLA[s.prioridade];
      await executar(
        `INSERT INTO categorias (nome, descricao, parent_id, prioridade, sla_resposta_horas, sla_solucao_horas, grupo_id, ativo, created_at, updated_at)
         VALUES (:nome, :descricao, :pai, :prioridade, :resposta, :solucao, :grupo, 1, :agora, :agora)`,
        {
          nome: s.nome,
          descricao: s.descricao || null,
          pai: pai.id,
          prioridade: s.prioridade,
          resposta: s.slaResposta ?? meta.resposta,
          solucao: s.slaSolucao ?? meta.solucao,
          grupo: grupos[s.grupo || c.grupo],
          agora,
        }
      );
      const [sub] = await sql('SELECT id FROM categorias WHERE nome = :nome AND parent_id = :pai', { nome: s.nome, pai: pai.id });
      subcategorias[`${c.nome} › ${s.nome}`] = sub.id;
    }
  }

  return { grupos, subcategorias };
}

// Grava os detalhes do formulário nas subcategorias de fábrica (pelo nome).
// Fica separado de inserirCatalogoPadrao porque as colunas vêm de uma
// migration posterior.
async function aplicarDetalhesCatalogo(queryInterface) {
  const { chaveDoCampo } = require('../services/formulario');
  for (const [caminho, d] of Object.entries(DETALHES_CATALOGO)) {
    const [pai, sub] = caminho.split(' › ');
    const campos = (d.campos || []).map((c) => ({ chave: chaveDoCampo(c.rotulo), ajuda: null, opcoes: [], ...c }));
    await queryInterface.sequelize.query(
      `UPDATE categorias s JOIN categorias p ON p.id = s.parent_id
          SET s.palavras_chave = :palavras, s.sugestoes = :sugestoes, s.modelo_descricao = :modelo, s.campos = :campos
        WHERE p.nome = :pai AND s.nome = :sub`,
      {
        replacements: {
          pai, sub,
          palavras: JSON.stringify(d.palavras || []),
          sugestoes: JSON.stringify(d.sugestoes || []),
          modelo: d.modelo || null,
          campos: JSON.stringify(campos),
        },
      }
    );
  }
}

module.exports = {
  GRUPOS, CATALOGO, DETALHES_CATALOGO, CONVERSAO_CATEGORIA_ANTIGA, inserirCatalogoPadrao, aplicarDetalhesCatalogo,
};
