// src/models/Chamado.js
const { Model, DataTypes } = require('sequelize');

class Chamado extends Model {
  static init(sequelize) {
    super.init({
      titulo: DataTypes.STRING,
      descricao: DataTypes.TEXT,
      status: DataTypes.STRING,
    }, {
      sequelize,
      tableName: 'chamados',
    });
  }

  static associate(models) {
    this.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    this.hasMany(models.Interacao, { foreignKey: 'chamado_id', as: 'interacoes' });
    this.hasMany(models.Anexo, { foreignKey: 'chamado_id', as: 'anexos' }); // Adicionar esta linha
  }
}

module.exports = Chamado;