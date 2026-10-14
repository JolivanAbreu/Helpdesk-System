// src/controllers/ChamadoController.js
const Chamado = require('../models/Chamado');
const Interacao = require('../models/Interacao');
const { STATUS_CHAMADO, isEquipe } = require('../config/perfis');
const { texto, validarChamado } = require('../utils/validacao');

// Status que o próprio dono (perfil comum) pode definir:
// encerrar o chamado ou reabri-lo. "em andamento" é só da equipe.
const STATUS_PERMITIDOS_DONO = ['aberto', 'resolvido'];

module.exports = {
  // Detalhes do chamado, com interações e anexos.
  // O acesso já foi validado pelo middleware chamadoAccess.
  async show(req, res) {
    const chamado = await Chamado.findByPk(req.chamado.id, {
      include: [
        { association: 'usuario', attributes: ['id', 'nome', 'email'] },
        {
          association: 'interacoes',
          include: { association: 'usuario', attributes: ['id', 'nome', 'perfil'] },
        },
        { association: 'anexos', attributes: ['id', 'nome_original', 'createdAt'] },
      ],
      order: [[{ model: Interacao, as: 'interacoes' }, 'createdAt', 'ASC']],
    });

    return res.json(chamado);
  },

  // Perfil comum vê só os próprios chamados; suporte e admin veem todos.
  async index(req, res) {
    const where = isEquipe(req.user) ? {} : { usuario_id: req.userId };

    const chamados = await Chamado.findAll({
      where,
      include: { association: 'usuario', attributes: ['id', 'nome', 'email'] },
      order: [['createdAt', 'DESC']],
    });

    return res.json(chamados);
  },

  async store(req, res) {
    const erro = validarChamado(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const chamado = await Chamado.create({
      titulo: texto(req.body.titulo),
      descricao: texto(req.body.descricao),
      status: 'aberto',
      usuario_id: req.userId,
    });

    return res.status(201).json(chamado);
  },

  async update(req, res) {
    const { status } = req.body;
    const { chamado } = req;

    if (!STATUS_CHAMADO.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${STATUS_CHAMADO.join(', ')}.` });
    }

    if (!isEquipe(req.user) && !STATUS_PERMITIDOS_DONO.includes(status)) {
      return res.status(403).json({ error: 'Apenas a equipe de suporte pode colocar o chamado em andamento.' });
    }

    chamado.status = status;
    await chamado.save();

    return res.json(chamado);
  },
};
