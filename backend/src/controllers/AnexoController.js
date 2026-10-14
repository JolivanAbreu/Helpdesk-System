// src/controllers/AnexoController.js
const path = require('path');
const fs = require('fs');
const Anexo = require('../models/Anexo');
const { UPLOADS_DIR } = require('../config/multer');

// O Multer entrega o nome original decodificado como latin1;
// convertemos para UTF-8 para acentos aparecerem corretamente.
const corrigirNome = (nome) => Buffer.from(nome, 'latin1').toString('utf8');

module.exports = {
  // Envia um anexo para o chamado.
  // O acesso já foi validado pelo chamadoAccess ANTES do upload,
  // então nenhum arquivo é gravado em disco para quem não tem acesso.
  async store(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado (campo "anexo").' });
    }

    try {
      const anexo = await Anexo.create({
        nome_original: corrigirNome(req.file.originalname),
        nome_arquivo: req.file.filename,
        chamado_id: req.chamado.id,
      });

      const { id, nome_original, createdAt } = anexo;
      return res.status(201).json({ id, nome_original, createdAt });
    } catch (erro) {
      // Se não deu para salvar no banco, não deixa arquivo órfão no disco
      fs.unlink(req.file.path, () => {});
      throw erro;
    }
  },

  // Baixa um anexo. Só funciona com token válido e acesso ao chamado,
  // ao contrário da antiga pasta pública /files.
  async download(req, res) {
    const anexo = await Anexo.findOne({
      where: { id: req.params.anexo_id, chamado_id: req.chamado.id },
    });

    if (!anexo) {
      return res.status(404).json({ error: 'Anexo não encontrado.' });
    }

    const caminho = path.join(UPLOADS_DIR, path.basename(anexo.nome_arquivo));

    if (!fs.existsSync(caminho)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
    }

    return res.download(caminho, anexo.nome_original);
  },
};
