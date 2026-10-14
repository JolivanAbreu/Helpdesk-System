// src/services/eventos.js
const Interacao = require('../models/Interacao');

// Registra na timeline do chamado algo que aconteceu (mudança de status,
// prioridade, responsável...). O frontend exibe como "<autor> <mensagem>",
// ex.: "Carlos Lima assumiu o chamado".
function registrarEvento(chamadoId, autorId, mensagem) {
  return Interacao.create({
    chamado_id: chamadoId,
    usuario_id: autorId,
    mensagem,
    tipo: 'evento',
  });
}

module.exports = { registrarEvento };
