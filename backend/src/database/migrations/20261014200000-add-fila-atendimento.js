'use strict';
// Fila de atendimento:
// - chamados.prioridade: baixa | media | alta | critica
// - chamados.responsavel_id: técnico (suporte/admin) que atende o chamado
// - chamados.resolvido_em: quando foi resolvido (para medir tempo de resolução)
// - interacoes.tipo: 'mensagem' (escrita por alguém) ou 'evento'
//   (registro automático: mudança de status, prioridade, responsável...)
//
// Usa SQL direto porque alguns métodos do queryInterface do Sequelize 6
// falham com o driver mariadb 3.x (erro "Cannot delete property 'meta'").
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`ALTER TABLE chamados
      ADD COLUMN prioridade VARCHAR(20) NOT NULL DEFAULT 'media' AFTER status,
      ADD COLUMN responsavel_id INTEGER NULL AFTER usuario_id,
      ADD COLUMN resolvido_em DATETIME NULL AFTER responsavel_id,
      ADD CONSTRAINT fk_chamados_responsavel
        FOREIGN KEY (responsavel_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
      ADD INDEX idx_chamados_status (status),
      ADD INDEX idx_chamados_prioridade (prioridade)`);

    await q(`ALTER TABLE interacoes
      ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'mensagem' AFTER mensagem`);

    // Chamados já resolvidos antes desta migration: usa a última atualização
    await q(`UPDATE chamados SET resolvido_em = updated_at WHERE status = 'resolvido'`);
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q('ALTER TABLE interacoes DROP COLUMN tipo');
    await q(`ALTER TABLE chamados
      DROP FOREIGN KEY fk_chamados_responsavel,
      DROP INDEX idx_chamados_status,
      DROP INDEX idx_chamados_prioridade,
      DROP COLUMN prioridade,
      DROP COLUMN responsavel_id,
      DROP COLUMN resolvido_em`);
  },
};
