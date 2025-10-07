// src/controllers/AnexoController.js
const Anexo = require('../models/Anexo');
const Chamado = require('../models/Chamado');

module.exports = {
  async store(req, res) {
    const { chamado_id } = req.params;

    // Verifica se o chamado existe
    const chamado = await Chamado.findByPk(chamado_id);
    if (!chamado) {
      return res.status(404).send({ error: 'Chamado não encontrado.' });
    }

    // Permissão: verifica se o usuário logado é o dono do chamado
    if (chamado.usuario_id !== req.userId) {
      return res.status(403).send({ error: 'Acesso negado.' });
    }

    const { originalname: nome_original, filename: nome_arquivo } = req.file;

    try {
      const anexo = await Anexo.create({
        nome_original,
        nome_arquivo,
        chamado_id,
      });

      return res.status(201).json(anexo);
    } catch (error) {
      return res.status(400).send({ error: 'Erro ao fazer upload do anexo.' });
    }
  },
};