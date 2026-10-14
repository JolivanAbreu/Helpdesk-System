// src/middleware/permission.js

// Libera a rota só para os perfis informados.
// Uso: routes.get('/usuarios', permission('admin'), ...)
// Depende do middleware de auth, que preenche req.user.
const permission = (...perfisPermitidos) => (req, res, next) => {
  if (!perfisPermitidos.includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para este recurso.' });
  }
  return next();
};

module.exports = permission;
