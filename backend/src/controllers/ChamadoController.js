// src/controllers/ChamadoController.js
const Chamado = require('../models/Chamado');
const Usuario = require('../models/Usuario');

module.exports = {
  // Listar chamados do usuário logado
  async index(req, res) {
    try {
      const chamados = await Chamado.findAll({
        where: {
          usuario_id: req.userId,
        },
        include: { association: 'usuario', attributes: ['nome', 'email'] },
        order: [['created_at', 'DESC']]
      });

      return res.json(chamados);
    } catch (error) {
      return res.status(400).send({ error: 'Erro ao listar chamados.' });
    }
  },

  // Criar um novo chamado
  async store(req, res) {
    const { titulo, descricao } = req.body;

    try {
      const chamado = await Chamado.create({
        titulo,
        descricao,
        usuario_id: req.userId,
      });

      return res.status(201).json(chamado);
    } catch (error) {
      return res.status(400).send({ error: 'Erro ao criar novo chamado.' });
    }
  },

  // Alterar status do chamado
  async update(req, res) {
    const { chamado_id } = req.params;
    const { status } = req.body;
    const validStatus = ['aberto', 'em andamento', 'resolvido'];

    if (!validStatus.includes(status)) {
      return res.status(400).send({ error: 'Status inválido.' });
    }

    try {
      const chamado = await Chamado.findByPk(chamado_id);

      if (!chamado) {
        return res.status(404).send({ error: 'Chamado não encontrado.' });
      }

      const usuario = await Usuario.findByPk(req.userId);
      if (chamado.usuario_id !== req.userId && usuario.perfil === 'comum') {
        return res.status(403).send({ error: 'Acesso negado. Você não é o dono deste chamado.' });
      }

      chamado.status = status;
      await chamado.save();

      return res.json(chamado);
    } catch (error) {
      return res.status(400).send({ error: 'Erro ao atualizar chamado.' });
    }
  },
};