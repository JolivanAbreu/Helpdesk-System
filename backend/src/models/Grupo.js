// src/models/Grupo.js
// Grupo técnico (ex.: Service Desk N1, Infraestrutura N2)
const { Model, DataTypes } = require('sequelize');

class Grupo extends Model {
  static init(sequelize) {
    super.init({
      nome: DataTypes.STRING,
      descricao: DataTypes.STRING,
      ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, {
      sequelize,
      tableName: 'grupos',
    });
  }

  static associate(models) {
    this.belongsToMany(models.Usuario, {
      through: 'usuarios_grupos', foreignKey: 'grupo_id', otherKey: 'usuario_id', as: { singular: 'membro', plural: 'membros' },
    });
    this.hasMany(models.Chamado, { foreignKey: 'grupo_id', as: 'chamados' });
  }
}

module.exports = Grupo;
