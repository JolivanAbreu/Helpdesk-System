// src/models/Anexo.js
const { Model, DataTypes } = require('sequelize');

class Anexo extends Model {
  static init(sequelize) {
    super.init({
      nome_original: DataTypes.STRING,
      nome_arquivo: DataTypes.STRING,
    }, {
      sequelize,
      tableName: 'anexos',
    });
  }

  static associate(models) {
    this.belongsTo(models.Chamado, { foreignKey: 'chamado_id', as: 'chamado' });
  }
}

module.exports = Anexo;