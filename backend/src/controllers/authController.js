// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { texto, validarCadastro, validarLogin } = require('../utils/validacao');

function generateToken(params = {}) {
  return jwt.sign(params, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
}

// Dados do usuário que podem ir para o frontend (nunca o hash da senha)
const usuarioPublico = ({ id, nome, email, perfil }) => ({ id, nome, email, perfil });

module.exports = {
  async register(req, res) {
    const erro = validarCadastro(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const nome = texto(req.body.nome);
    const email = texto(req.body.email).toLowerCase();

    if (await Usuario.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const senha_hash = await bcrypt.hash(req.body.senha, 10);

    // Todo cadastro público entra como 'comum'. Qualquer valor de
    // "perfil" enviado no corpo é ignorado; só o admin promove usuários.
    const usuario = await Usuario.create({ nome, email, senha_hash, perfil: 'comum' });

    return res.status(201).json({
      usuario: usuarioPublico(usuario),
      token: generateToken({ id: usuario.id }),
    });
  },

  async login(req, res) {
    const erro = validarLogin(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const email = texto(req.body.email).toLowerCase();
    const usuario = await Usuario.findOne({ where: { email } });

    // Mesma resposta para e-mail inexistente e senha errada, para não
    // revelar quais e-mails estão cadastrados.
    if (!usuario || !(await usuario.checkPassword(req.body.senha))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // Só informa que a conta está desativada depois de a senha conferir,
    // para não revelar nada a quem não sabe a senha.
    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Conta desativada. Procure o administrador.' });
    }

    return res.json({
      usuario: usuarioPublico(usuario),
      token: generateToken({ id: usuario.id }),
    });
  },
};
