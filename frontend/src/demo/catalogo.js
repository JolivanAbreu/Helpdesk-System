// src/demo/catalogo.js
// Catálogo e grupos de fábrica da demonstração: cópia de
// backend/src/database/catalogoPadrao.js (os testes de contrato conferem
// que os dois lados devolvem o mesmo catálogo, com os mesmos IDs).

// Mesmas metas de backend/src/config/perfis.js (horas corridas)
export const METAS_SLA = {
  critica: { resposta: 1, solucao: 4 },
  alta: { resposta: 2, solucao: 8 },
  media: { resposta: 4, solucao: 24 },
  baixa: { resposta: 8, solucao: 72 },
};

const GRUPOS = [
  { chave: "n1", nome: "Service Desk (N1)", descricao: "Primeiro atendimento: triagem, acessos, equipamentos e dúvidas" },
  { chave: "infra", nome: "Infraestrutura (N2)", descricao: "Rede, servidores, backup, telefonia e segurança" },
  { chave: "sistemas", nome: "Sistemas (N2)", descricao: "ERP e sistemas internos" },
];

const CATALOGO = [
  {
    nome: "Hardware", icone: "hardware", grupo: "n1", descricao: "Computador, impressora, monitor e periféricos",
    subcategorias: [
      { nome: "Computador ou notebook", prioridade: "alta", descricao: "Não liga, reinicia sozinho, está lento ou com defeito" },
      { nome: "Impressora", prioridade: "alta", descricao: "Não imprime, atola papel ou está sem toner" },
      { nome: "Monitor e vídeo", prioridade: "media" },
      { nome: "Teclado, mouse e webcam", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Software e sistemas", icone: "software", grupo: "n1", descricao: "Programas, sistemas internos e licenças",
    subcategorias: [
      { nome: "Sistema fora do ar", prioridade: "critica", grupo: "sistemas", descricao: "ERP ou sistema interno indisponível" },
      { nome: "Backup e servidores", prioridade: "critica", grupo: "infra" },
      { nome: "Antivírus e segurança", prioridade: "alta", grupo: "infra" },
      { nome: "Licenças", prioridade: "media" },
      { nome: "Instalação de programa", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Rede e internet", icone: "rede", grupo: "infra", descricao: "Internet, VPN, Wi-Fi e telefonia",
    subcategorias: [
      { nome: "Lentidão ou queda de rede", prioridade: "alta" },
      { nome: "VPN", prioridade: "media" },
      { nome: "Telefone IP", prioridade: "media" },
      { nome: "Wi-Fi", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Acessos e senhas", icone: "acessos", grupo: "n1", descricao: "Senhas, permissões e usuários",
    subcategorias: [
      { nome: "Redefinir senha", prioridade: "alta", slaResposta: 0.5, slaSolucao: 2, descricao: "Senha expirada ou conta bloqueada" },
      { nome: "Permissão em pasta ou sistema", prioridade: "media" },
      { nome: "Criar ou desativar usuário", prioridade: "media" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "E-mail", icone: "email", grupo: "n1", descricao: "Caixa de entrada, Outlook e envio",
    subcategorias: [
      { nome: "Configuração de e-mail", prioridade: "media" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Outros", icone: "outros", grupo: "n1", descricao: "Qualquer outro assunto",
    subcategorias: [{ nome: "Outros assuntos", prioridade: "media" }],
  },
];

// Monta as tabelas na mesma ordem de inserção do backend (mesmos IDs)
export function catalogoInicial(criadoEm) {
  const grupos = GRUPOS.map((g, i) => ({ id: i + 1, nome: g.nome, descricao: g.descricao, ativo: true, createdAt: criadoEm }));
  const idGrupo = Object.fromEntries(GRUPOS.map((g, i) => [g.chave, i + 1]));
  const categorias = [];
  CATALOGO.forEach((c) => {
    const pai = {
      id: categorias.length + 1, nome: c.nome, descricao: c.descricao || null, icone: c.icone, parent_id: null,
      prioridade: null, sla_resposta_horas: null, sla_solucao_horas: null, grupo_id: idGrupo[c.grupo], ativo: true,
    };
    categorias.push(pai);
    c.subcategorias.forEach((s) => {
      const meta = METAS_SLA[s.prioridade];
      categorias.push({
        id: categorias.length + 1, nome: s.nome, descricao: s.descricao || null, icone: null, parent_id: pai.id,
        prioridade: s.prioridade, sla_resposta_horas: s.slaResposta ?? meta.resposta, sla_solucao_horas: s.slaSolucao ?? meta.solucao,
        grupo_id: idGrupo[s.grupo || c.grupo], ativo: true,
      });
    });
  });
  return { grupos, categorias };
}
