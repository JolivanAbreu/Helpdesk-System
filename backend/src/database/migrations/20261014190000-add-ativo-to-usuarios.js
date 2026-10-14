'use strict';
// Permite ao admin desativar contas sem apagar o usuário.
// Uma conta desativada não consegue entrar, mas o histórico
// de chamados e mensagens dela continua preservado.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'ativo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
  down: async (queryInterface) => {
    // SQL direto: o removeColumn do Sequelize 6 falha com o driver
    // mariadb 3.x ("Cannot delete property 'meta' of [object Array]").
    await queryInterface.sequelize.query('ALTER TABLE usuarios DROP COLUMN ativo');
  },
};
