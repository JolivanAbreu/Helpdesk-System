// src/controllers/InteracaoController.js
const Interacao = require('../models/Interacao');
const { texto, validarMensagem } = require('../utils/validacao');

module.exports = {
  // Adiciona uma mensagem ao chamado.
  // O acesso já foi validado pelo middleware chamadoAccess.
  async store(req, res) {
    const erro = validarMensagem(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const interacao = await Interacao.create({
      mensagem: texto(req.body.mensagem),
      chamado_id: req.chamado.id,
      usuario_id: req.userId,
    });

    return res.status(201).json(interacao);
  },
};
