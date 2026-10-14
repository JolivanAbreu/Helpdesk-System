// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Valida o token JWT e carrega o usuário logado em req.user.
// O perfil é lido do banco a cada requisição, então uma mudança
// de perfil feita pelo admin vale na hora, sem precisar de novo login.
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não informado.' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (!token || !/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  const usuario = await Usuario.findByPk(decoded.id, {
    attributes: ['id', 'nome', 'email', 'perfil', 'ativo'],
  });

  if (!usuario) {
    return res.status(401).json({ error: 'Usuário não encontrado.' });
  }

  // Conta desativada pelo admin perde o acesso na hora,
  // mesmo que ainda tenha um token válido.
  if (!usuario.ativo) {
    return res.status(401).json({ error: 'Conta desativada. Procure o administrador.' });
  }

  req.userId = usuario.id;
  req.user = usuario;
  return next();
};
