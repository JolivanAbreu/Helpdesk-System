// src/models/Categoria.js
// Catálogo em dois níveis: categoria (parent_id nulo) > subcategoria.
// A subcategoria define prioridade, prazos de SLA (em horas) e o grupo
// que recebe o chamado.
const { Model, DataTypes } = require('sequelize');
const { colunaJson } = require('./json');

class Categoria extends Model {
  static init(sequelize) {
    super.init({
      nome: DataTypes.STRING,
      descricao: DataTypes.STRING,
      icone: DataTypes.STRING,
      prioridade: DataTypes.STRING,
      // DECIMAL chega do driver como texto; o getter devolve número
      sla_resposta_horas: {
        type: DataTypes.DECIMAL(6, 2),
        get() { const v = this.getDataValue('sla_resposta_horas'); return v === null ? null : Number(v); },
      },
      sla_solucao_horas: {
        type: DataTypes.DECIMAL(6, 2),
        get() { const v = this.getDataValue('sla_solucao_horas'); return v === null ? null : Number(v); },
      },
      // Formulário da subcategoria (JSON em colunas TEXT)
      palavras_chave: colunaJson('palavras_chave'),
      sugestoes: colunaJson('sugestoes'),
      modelo_descricao: DataTypes.TEXT,
      campos: colunaJson('campos'),
      ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, {
      sequelize,
      tableName: 'categorias',
    });
  }

  static associate(models) {
    this.belongsTo(models.Categoria, { foreignKey: 'parent_id', as: 'pai' });
    this.hasMany(models.Categoria, { foreignKey: 'parent_id', as: 'subcategorias' });
    this.belongsTo(models.Grupo, { foreignKey: 'grupo_id', as: 'grupo' });
  }
}

module.exports = Categoria;
