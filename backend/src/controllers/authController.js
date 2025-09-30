// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

// Função para gerar token
function generateToken(params = {}) {
  return jwt.sign(params, process.env.JWT_SECRET, {
    expiresIn: 86400, // Expira em 24 horas
  });
}

module.exports = {
  async register(req, res) {
    const { email, nome, senha, perfil = 'comum' } = req.body;

    try {
      if (await Usuario.findOne({ where: { email } })) {
        return res.status(400).send({ error: 'Usuário já existe' });
      }

      const senha_hash = await bcrypt.hash(senha, 10);

      const usuario = await Usuario.create({ nome, email, senha_hash, perfil });

      usuario.senha_hash = undefined; // Não retornar o hash da senha

      return res.send({ 
        usuario, 
        token: generateToken({ id: usuario.id }) 
      });
    } catch (err) {
      return res.status(400).send({ error: 'Falha no registro: ' + err });
    }
  },

  async login(req, res) {
    const { email, senha } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(400).send({ error: 'Usuário não encontrado' });
    }

    if (!await usuario.checkPassword(senha)) {
      return res.status(400).send({ error: 'Senha inválida' });
    }

    usuario.senha_hash = undefined;

    res.send({ 
      usuario, 
      token: generateToken({ id: usuario.id }) 
    });
  },
};