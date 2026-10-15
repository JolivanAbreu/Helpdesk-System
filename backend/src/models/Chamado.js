// src/models/Chamado.js
const { Model, DataTypes } = require('sequelize');

class Chamado extends Model {
  static init(sequelize) {
    super.init({
      titulo: DataTypes.STRING,
      descricao: DataTypes.TEXT,
      status: DataTypes.STRING,
      prioridade: {
        type: DataTypes.STRING,
        defaultValue: 'media',
      },
      categoria: {
        type: DataTypes.STRING,
        defaultValue: 'outros',
      },
      resolvido_em: DataTypes.DATE,
      primeira_resposta_em: DataTypes.DATE,
    }, {
      sequelize,
      tableName: 'chamados',
    });
  }

  static associate(models) {
    this.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    this.belongsTo(models.Usuario, { foreignKey: 'responsavel_id', as: 'responsavel' });
    this.hasMany(models.Interacao, { foreignKey: 'chamado_id', as: 'interacoes' });
    this.hasMany(models.Anexo, { foreignKey: 'chamado_id', as: 'anexos' });
  }
}

module.exports = Chamado;
