// src/controllers/InteracaoController.js
const Interacao = require('../models/Interacao');
const { isEquipe } = require('../config/perfis');
const { texto, validarMensagem } = require('../utils/validacao');

module.exports = {
  // Adiciona uma mensagem ao chamado, ou uma nota interna ({ interna: true }).
  // O acesso já foi validado pelo middleware chamadoAccess.
  async store(req, res) {
    const erro = validarMensagem(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const { chamado, user } = req;
    const interna = req.body.interna === true;

    if (interna && !isEquipe(user)) {
      return res.status(403).json({ error: 'Apenas a equipe de suporte pode escrever notas internas.' });
    }

    const interacao = await Interacao.create({
      mensagem: texto(req.body.mensagem),
      tipo: interna ? 'nota' : 'mensagem',
      chamado_id: chamado.id,
      usuario_id: user.id,
    });

    // A primeira mensagem da equipe ao solicitante conta para o SLA de resposta.
    // Notas internas não contam: o solicitante não as vê.
    if (!interna && isEquipe(user) && user.id !== chamado.usuario_id && !chamado.primeira_resposta_em) {
      chamado.primeira_resposta_em = interacao.createdAt;
      await chamado.save({ silent: true });
    }

    return res.status(201).json(interacao);
  },
};
