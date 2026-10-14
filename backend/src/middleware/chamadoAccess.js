// src/middleware/chamadoAccess.js
const Chamado = require('../models/Chamado');
const { isEquipe } = require('../config/perfis');

// Carrega o chamado de :chamado_id em req.chamado e só deixa passar
// o dono do chamado ou alguém da equipe (suporte/admin).
// Usado em todas as rotas /chamados/:chamado_id/...
module.exports = async (req, res, next) => {
  const id = Number(req.params.chamado_id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de chamado inválido.' });
  }

  const chamado = await Chamado.findByPk(id);

  if (!chamado) {
    return res.status(404).json({ error: 'Chamado não encontrado.' });
  }

  if (chamado.usuario_id !== req.userId && !isEquipe(req.user)) {
    return res.status(403).json({ error: 'Acesso negado a este chamado.' });
  }

  req.chamado = chamado;
  return next();
};
