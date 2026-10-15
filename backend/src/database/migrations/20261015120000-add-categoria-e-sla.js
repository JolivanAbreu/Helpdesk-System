'use strict';
// - chamados.categoria: assunto do chamado (hardware, rede, acessos...)
// - chamados.primeira_resposta_em: quando a equipe respondeu o solicitante
//   pela primeira vez (usado no SLA de primeira resposta)
// - interacoes.tipo passa a aceitar 'nota' (nota interna, só a equipe vê);
//   a coluna já é texto livre, então não muda de estrutura.
//
// SQL direto pelo mesmo motivo da migration da fila (driver mariadb 3.x).
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`ALTER TABLE chamados
      ADD COLUMN categoria VARCHAR(30) NOT NULL DEFAULT 'outros' AFTER prioridade,
      ADD COLUMN primeira_resposta_em DATETIME NULL AFTER resolvido_em,
      ADD INDEX idx_chamados_categoria (categoria)`);

    // Chamados existentes: a primeira resposta é a primeira mensagem da equipe
    await q(`UPDATE chamados c
      JOIN (
        SELECT i.chamado_id, MIN(i.created_at) AS primeira
          FROM interacoes i
          JOIN usuarios u ON u.id = i.usuario_id
          JOIN chamados ch ON ch.id = i.chamado_id
         WHERE i.tipo = 'mensagem' AND u.perfil IN ('suporte', 'admin') AND i.usuario_id <> ch.usuario_id
         GROUP BY i.chamado_id
      ) r ON r.chamado_id = c.id
      SET c.primeira_resposta_em = r.primeira`);
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("DELETE FROM interacoes WHERE tipo = 'nota'");
    await q(`ALTER TABLE chamados
      DROP INDEX idx_chamados_categoria,
      DROP COLUMN categoria,
      DROP COLUMN primeira_resposta_em`);
  },
};
