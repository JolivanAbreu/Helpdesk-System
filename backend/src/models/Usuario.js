// src/models/Usuario.js
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

class Usuario extends Model {
  static init(sequelize) {
    super.init({
      nome: DataTypes.STRING,
      email: DataTypes.STRING,
      perfil: DataTypes.STRING, // Ex: 'comum', 'suporte', 'admin'
      senha_hash: DataTypes.STRING,
      ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    }, {
      sequelize,
      tableName: 'usuarios',
    });
  }

  static associate(models) {
    this.hasMany(models.Chamado, { foreignKey: 'usuario_id', as: 'chamados' });
    this.belongsToMany(models.Grupo, {
      through: 'usuarios_grupos', foreignKey: 'usuario_id', otherKey: 'grupo_id', as: { singular: 'grupo', plural: 'grupos' },
    });
  }

  checkPassword(senha) {
    return bcrypt.compare(senha, this.senha_hash);
  }
}

module.exports = Usuario;