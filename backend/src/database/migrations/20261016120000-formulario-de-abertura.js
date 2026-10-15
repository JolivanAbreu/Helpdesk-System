'use strict';
// Formulário de abertura de chamado (Central de Serviços).
//
// - usuarios: setor, cargo, ramal e localização, que preenchem o formulário
//   automaticamente
// - categorias: palavras-chave (busca inteligente), sugestões de título,
//   modelo de descrição e campos específicos de cada subcategoria (JSON)
// - chamados: contato e local do atendimento, e as respostas do formulário
//   (JSON, com o rótulo de cada pergunta)
const { aplicarDetalhesCatalogo } = require('../catalogoPadrao');

module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`ALTER TABLE usuarios
      ADD COLUMN setor VARCHAR(80) NULL AFTER perfil,
      ADD COLUMN cargo VARCHAR(80) NULL AFTER setor,
      ADD COLUMN ramal VARCHAR(30) NULL AFTER cargo,
      ADD COLUMN localizacao VARCHAR(120) NULL AFTER ramal`);

    await q(`ALTER TABLE categorias
      ADD COLUMN palavras_chave TEXT NULL AFTER grupo_id,
      ADD COLUMN sugestoes TEXT NULL AFTER palavras_chave,
      ADD COLUMN modelo_descricao TEXT NULL AFTER sugestoes,
      ADD COLUMN campos TEXT NULL AFTER modelo_descricao`);

    await q(`ALTER TABLE chamados
      ADD COLUMN contato VARCHAR(40) NULL AFTER descricao,
      ADD COLUMN local VARCHAR(120) NULL AFTER contato,
      ADD COLUMN respostas TEXT NULL AFTER local`);

    await aplicarDetalhesCatalogo(queryInterface);
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE chamados DROP COLUMN contato, DROP COLUMN local, DROP COLUMN respostas');
    await q('ALTER TABLE categorias DROP COLUMN palavras_chave, DROP COLUMN sugestoes, DROP COLUMN modelo_descricao, DROP COLUMN campos');
    await q('ALTER TABLE usuarios DROP COLUMN setor, DROP COLUMN cargo, DROP COLUMN ramal, DROP COLUMN localizacao');
  },
};
