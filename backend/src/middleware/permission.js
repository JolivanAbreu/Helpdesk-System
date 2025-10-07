// src/middleware/permission.js

const Usuario = require('../models/Usuario');

const permission = (...requiredProfiles) => {
  return async (req, res, next) => {
    const { userId } = req;

    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      return res.status(401).send({ error: 'Usuário não encontrado.' });
    }

    const { perfil } = usuario;

    const hasPermission = requiredProfiles.some(p => p === perfil);

    if (!hasPermission) {
      return res.status(403).send({ error: 'Acesso negado. Você não tem permissão para este recurso.' });
    }

    return next();
  };
};

module.exports = permission;