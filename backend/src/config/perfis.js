// src/config/perfis.js
// Perfis de acesso, status, prioridades, categorias e metas de atendimento (SLA).

const PERFIS = ['comum', 'suporte', 'admin'];

// Perfis que atendem chamados e podem ver/alterar chamados de outras pessoas
const PERFIS_EQUIPE = ['suporte', 'admin'];

const STATUS_CHAMADO = ['aberto', 'em andamento', 'resolvido'];

// Da mais urgente para a menos urgente (a ordem é usada na ordenação)
const PRIORIDADES = ['critica', 'alta', 'media', 'baixa'];

const ROTULO_PRIORIDADE = { critica: 'crítica', alta: 'alta', media: 'média', baixa: 'baixa' };

const CATEGORIAS = {
  hardware: 'Hardware',
  software: 'Software e sistemas',
  rede: 'Rede e internet',
  acessos: 'Acessos e senhas',
  email: 'E-mail',
  outros: 'Outros',
};

// Metas de atendimento, em horas corridas a partir da abertura do chamado.
// resposta: prazo para a primeira mensagem da equipe ao solicitante
// solucao: prazo para o chamado ser resolvido
const METAS_SLA = {
  critica: { resposta: 1, solucao: 4 },
  alta: { resposta: 2, solucao: 8 },
  media: { resposta: 4, solucao: 24 },
  baixa: { resposta: 8, solucao: 72 },
};

// A partir de 75% do prazo consumido, o chamado entra "em risco"
const LIMITE_RISCO_SLA = 0.75;

const isEquipe = (usuario) => PERFIS_EQUIPE.includes(usuario.perfil);

module.exports = {
  PERFIS, PERFIS_EQUIPE, STATUS_CHAMADO, PRIORIDADES, ROTULO_PRIORIDADE,
  CATEGORIAS, METAS_SLA, LIMITE_RISCO_SLA, isEquipe,
};
