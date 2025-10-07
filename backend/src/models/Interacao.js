// src/models/Interacao.js
const { Model, DataTypes } = require('sequelize');

class Interacao extends Model {
  static init(sequelize) {
    super.init({
      mensagem: DataTypes.TEXT,
    }, {
      sequelize,
      tableName: 'interacoes',
    });
  }

  static associate(models) {
    this.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    this.belongsTo(models.Chamado, { foreignKey: 'chamado_id', as: 'chamado' });
  }
}

module.exports = Interacao;