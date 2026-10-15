// src/models/json.js
// Coluna TEXT que guarda JSON (listas e objetos), lida e gravada já
// convertida. Usada no lugar do tipo JSON para funcionar igual em
// qualquer versão do MariaDB/MySQL.
const { DataTypes } = require('sequelize');

function colunaJson(nome) {
  return {
    type: DataTypes.TEXT,
    get() {
      const bruto = this.getDataValue(nome);
      if (bruto === null || bruto === undefined || bruto === '') return [];
      try {
        return JSON.parse(bruto);
      } catch {
        return [];
      }
    },
    set(valor) {
      this.setDataValue(nome, valor === null || valor === undefined ? null : JSON.stringify(valor));
    },
  };
}

module.exports = { colunaJson };
