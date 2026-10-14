// src/controllers/UsuarioController.js
const Usuario = require('../models/Usuario');
const { PERFIS } = require('../config/perfis');

module.exports = {
  // Lista todos os usuários (somente admin)
  async index(req, res) {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nome', 'email', 'perfil', 'createdAt'],
      order: [['nome', 'ASC']],
    });

    return res.json(usuarios);
  },

  // Altera o perfil de um usuário (somente admin)
  async updatePerfil(req, res) {
    const { usuario_id } = req.params;
    const { perfil } = req.body;

    if (!PERFIS.includes(perfil)) {
      return res.status(400).json({ error: `Perfil inválido. Use: ${PERFIS.join(', ')}.` });
    }

    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Evita que o admin tire o próprio acesso e o sistema fique sem admin
    if (usuario.id === req.userId && perfil !== 'admin') {
      return res.status(400).json({ error: 'Você não pode remover o seu próprio perfil de admin.' });
    }

    usuario.perfil = perfil;
    await usuario.save();

    const { id, nome, email } = usuario;
    return res.json({ id, nome, email, perfil });
  },
};
