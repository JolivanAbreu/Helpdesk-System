// src/config/perfis.js
// Perfis de acesso, status e prioridades aceitos pelo sistema.

const PERFIS = ['comum', 'suporte', 'admin'];

// Perfis que atendem chamados e podem ver/alterar chamados de outras pessoas
const PERFIS_EQUIPE = ['suporte', 'admin'];

const STATUS_CHAMADO = ['aberto', 'em andamento', 'resolvido'];

// Da mais urgente para a menos urgente (a ordem é usada na ordenação)
const PRIORIDADES = ['critica', 'alta', 'media', 'baixa'];

const ROTULO_PRIORIDADE = { critica: 'crítica', alta: 'alta', media: 'média', baixa: 'baixa' };

const isEquipe = (usuario) => PERFIS_EQUIPE.includes(usuario.perfil);

module.exports = {
  PERFIS, PERFIS_EQUIPE, STATUS_CHAMADO, PRIORIDADES, ROTULO_PRIORIDADE, isEquipe,
};
