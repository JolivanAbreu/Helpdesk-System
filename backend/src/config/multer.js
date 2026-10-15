// src/config/multer.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// UPLOADS_DIR no .env muda a pasta (os testes usam uma pasta própria)
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '..', '..', 'tmp', 'uploads');

const MIMES_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const TAMANHO_MAXIMO_MB = 10;

module.exports = {
  UPLOADS_DIR,
  TAMANHO_MAXIMO_MB,

  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // O arquivo em disco recebe um nome aleatório + a extensão do tipo real.
    // O nome original fica só no banco (para exibir e para o download),
    // o que evita problemas com acentos, espaços e caminhos maliciosos.
    filename: (req, file, cb) => {
      crypto.randomBytes(16, (err, hash) => {
        if (err) return cb(err);
        return cb(null, `${hash.toString('hex')}${MIMES_PERMITIDOS[file.mimetype]}`);
      });
    },
  }),

  limits: {
    fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (MIMES_PERMITIDOS[file.mimetype]) {
      return cb(null, true);
    }
    const erro = new Error('Tipo de arquivo não permitido. Envie imagens (JPG, PNG, GIF) ou PDF.');
    erro.status = 400;
    return cb(erro);
  },
};
