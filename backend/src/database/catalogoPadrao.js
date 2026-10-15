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

module.exports = { GRUPOS, CATALOGO, CONVERSAO_CATEGORIA_ANTIGA, inserirCatalogoPadrao };
