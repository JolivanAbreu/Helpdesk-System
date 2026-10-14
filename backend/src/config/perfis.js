// src/config/perfis.js
// Perfis de acesso e status de chamado aceitos pelo sistema.

const PERFIS = ['comum', 'suporte', 'admin'];

// Perfis que atendem chamados e podem ver/alterar chamados de outras pessoas
const PERFIS_EQUIPE = ['suporte', 'admin'];

const STATUS_CHAMADO = ['aberto', 'em andamento', 'resolvido'];

const isEquipe = (usuario) => PERFIS_EQUIPE.includes(usuario.perfil);

module.exports = { PERFIS, PERFIS_EQUIPE, STATUS_CHAMADO, isEquipe };
