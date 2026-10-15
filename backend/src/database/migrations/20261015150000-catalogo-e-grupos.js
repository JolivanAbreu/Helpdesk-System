'use strict';
// Catálogo de categorias em dois níveis, grupos técnicos e prazos gravados.
//
// - grupos / usuarios_grupos: equipes de atendimento e seus membros
// - categorias: categoria (parent_id nulo) > subcategoria. A subcategoria
//   define prioridade, prazos de SLA e grupo que recebe o chamado
// - chamados: categoria_id (subcategoria), grupo_id e os prazos de
//   resposta e solução, gravados na abertura (o histórico de SLA não muda
//   quando o catálogo é editado depois)
//
// Os chamados existentes são convertidos: a categoria antiga (texto) vira a
// subcategoria "Outros" da categoria equivalente, e os prazos são calculados
// pela prioridade que eles já tinham.
const { METAS_SLA, PRIORIDADES } = require('../../config/perfis');
const { inserirCatalogoPadrao, CONVERSAO_CATEGORIA_ANTIGA } = require('../catalogoPadrao');

const minutosPorPrioridade = (prazo) =>
  `CASE prioridade ${PRIORIDADES.map((p) => `WHEN '${p}' THEN ${Math.round(METAS_SLA[p][prazo] * 60)}`).join(' ')} END`;

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });

    await q(`CREATE TABLE grupos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      descricao VARCHAR(255) NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uq_grupos_nome (nome)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q(`CREATE TABLE usuarios_grupos (
      usuario_id INT NOT NULL,
      grupo_id INT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (usuario_id, grupo_id),
      CONSTRAINT fk_ug_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_ug_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q(`CREATE TABLE categorias (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      descricao VARCHAR(255) NULL,
      icone VARCHAR(30) NULL,
      parent_id INT NULL,
      prioridade VARCHAR(20) NULL,
      sla_resposta_horas DECIMAL(6,2) NULL,
      sla_solucao_horas DECIMAL(6,2) NULL,
      grupo_id INT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      CONSTRAINT fk_categorias_pai FOREIGN KEY (parent_id) REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_categorias_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q(`ALTER TABLE chamados
      ADD COLUMN categoria_id INT NULL AFTER prioridade,
      ADD COLUMN grupo_id INT NULL AFTER responsavel_id,
      ADD COLUMN prazo_resposta DATETIME NULL AFTER primeira_resposta_em,
      ADD COLUMN prazo_solucao DATETIME NULL AFTER prazo_resposta,
      ADD CONSTRAINT fk_chamados_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD CONSTRAINT fk_chamados_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD INDEX idx_chamados_prazo_solucao (prazo_solucao)`);

    // Catálogo e grupos de fábrica
    const { subcategorias } = await inserirCatalogoPadrao(queryInterface);

    // Converte os chamados existentes
    for (const [antiga, nova] of Object.entries(CONVERSAO_CATEGORIA_ANTIGA)) {
      await q(
        `UPDATE chamados c JOIN categorias s ON s.id = :sub
            SET c.categoria_id = s.id, c.grupo_id = s.grupo_id
          WHERE c.categoria = :antiga`,
        { sub: subcategorias[nova], antiga }
      );
    }
    await q(`UPDATE chamados SET
      prazo_resposta = DATE_ADD(created_at, INTERVAL (${minutosPorPrioridade('resposta')}) MINUTE),
      prazo_solucao = DATE_ADD(created_at, INTERVAL (${minutosPorPrioridade('solucao')}) MINUTE)`);

    await q('ALTER TABLE chamados DROP INDEX idx_chamados_categoria, DROP COLUMN categoria');
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q("ALTER TABLE chamados ADD COLUMN categoria VARCHAR(30) NOT NULL DEFAULT 'outros' AFTER prioridade, ADD INDEX idx_chamados_categoria (categoria)");
    // O ícone da categoria principal guarda a chave antiga (hardware, rede...)
    await q(`UPDATE chamados c
      JOIN categorias s ON s.id = c.categoria_id
      JOIN categorias p ON p.id = s.parent_id
       SET c.categoria = COALESCE(p.icone, 'outros')`);
    await q(`ALTER TABLE chamados
      DROP FOREIGN KEY fk_chamados_categoria,
      DROP FOREIGN KEY fk_chamados_grupo,
      DROP INDEX idx_chamados_prazo_solucao,
      DROP COLUMN categoria_id,
      DROP COLUMN grupo_id,
      DROP COLUMN prazo_resposta,
      DROP COLUMN prazo_solucao`);
    await q('DROP TABLE categorias');
    await q('DROP TABLE usuarios_grupos');
    await q('DROP TABLE grupos');
  },
};
