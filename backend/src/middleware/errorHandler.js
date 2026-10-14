// src/middleware/errorHandler.js
const multer = require('multer');
const { TAMANHO_MAXIMO_MB } = require('../config/multer');

// Tratador central de erros. O Express 5 encaminha para cá qualquer
// erro lançado (inclusive em funções async), então os controllers
// não precisam de try/catch só para responder 500.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const mensagem = err.code === 'LIMIT_FILE_SIZE'
      ? `O arquivo excede o limite de ${TAMANHO_MAXIMO_MB} MB.`
      : 'Erro no envio do arquivo.';
    return res.status(400).json({ error: mensagem });
  }

  // JSON mal formado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }

  // Erros que já sabem o próprio status (ex.: tipo de arquivo inválido)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Erro inesperado: registra o detalhe no servidor e devolve
  // uma mensagem genérica, sem expor informações internas.
  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
};
