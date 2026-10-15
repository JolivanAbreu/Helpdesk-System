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
      resolvido_em: DataTypes.DATE,
      primeira_resposta_em: DataTypes.DATE,
      // Prazos gravados na abertura (e recalculados só quando a equipe
      // muda a subcategoria ou a prioridade deste chamado)
      prazo_resposta: DataTypes.DATE,
      prazo_solucao: DataTypes.DATE,
    }, {
      sequelize,
      tableName: 'chamados',
    });
  }

  static associate(models) {
    this.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    this.belongsTo(models.Usuario, { foreignKey: 'responsavel_id', as: 'responsavel' });
    this.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
    this.belongsTo(models.Grupo, { foreignKey: 'grupo_id', as: 'grupo' });
    this.hasMany(models.Interacao, { foreignKey: 'chamado_id', as: 'interacoes' });
    this.hasMany(models.Anexo, { foreignKey: 'chamado_id', as: 'anexos' });
  }
}

module.exports = Chamado;
