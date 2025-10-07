// src/controllers/UsuarioController.js

const Usuario = require('../models/Usuario');

module.exports = {
  async index(req, res) {
    try {
      const usuarios = await Usuario.findAll({
        attributes: { exclude: ['senha_hash'] },
      });

      return res.json(usuarios);
    } catch (error) {
      return res.status(500).send({ error: 'Erro ao carregar usuários.' });
    }
  }
};