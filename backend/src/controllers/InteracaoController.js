// backend/src/controllers/InteracaoController.js
const Interacao = require('../models/Interacao');
const Chamado = require('../models/Chamado');

module.exports = {
    async store(req, res) {
        const { chamado_id } = req.params;
        const { mensagem } = req.body;
        const usuario_id = req.userId;

        const chamado = await Chamado.findByPk(chamado_id);
        if (!chamado) {
            return res.status(404).send({ error: 'Chamado não encontrado.' });
        }

        try {
            const interacao = await Interacao.create({
                mensagem,
                chamado_id,
                usuario_id,
            });

            return res.status(201).json(interacao);
        } catch (err) {
            return res.status(400).send({ error: 'Falha ao adicionar interação.' });
        }
    },
};