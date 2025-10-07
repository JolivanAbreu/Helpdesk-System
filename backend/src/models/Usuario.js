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
    }, {
      sequelize,
      tableName: 'usuarios',
    });
  }

  static associate(models) {
    this.hasMany(models.Chamado, { foreignKey: 'usuario_id', as: 'chamados' });
  }

  checkPassword(senha) {
    return bcrypt.compare(senha, this.senha_hash);
  }
}

module.exports = Usuario;