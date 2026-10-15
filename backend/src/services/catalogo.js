// src/services/catalogo.js
// Consultas do catálogo de categorias usadas por mais de um controller.
const { Op } = require('sequelize');
const Categoria = require('../models/Categoria');
const Grupo = require('../models/Grupo');

// "Hardware › Impressora"
const nomeCompleto = (sub) => (sub?.pai ? `${sub.pai.nome} › ${sub.nome}` : sub?.nome || 'sem categoria');

// Subcategoria ativa (com categoria principal ativa) ou null
async function subcategoriaAtiva(id) {
  if (!(Number.isInteger(id) && id > 0)) return null;
  const sub = await Categoria.findOne({
    where: { id, parent_id: { [Op.ne]: null }, ativo: true },
    include: { association: 'pai', where: { ativo: true }, required: true },
  });
  return sub;
}

// IDs de subcategoria correspondentes a uma lista de IDs do catálogo:
// categoria principal vale por todas as suas subcategorias.
async function expandirCategorias(ids) {
  if (!ids.length) return [];
  const encontradas = await Categoria.findAll({
    where: { [Op.or]: [{ id: ids }, { parent_id: ids }] },
    attributes: ['id', 'parent_id'],
    raw: true,
  });
  return encontradas.filter((c) => c.parent_id !== null).map((c) => c.id);
}

// IDs dos grupos de que o usuário participa
async function gruposDoUsuario(usuarioId) {
  const grupos = await Grupo.findAll({
    attributes: ['id'],
    include: { association: 'membros', attributes: [], where: { id: usuarioId }, through: { attributes: [] } },
  });
  return grupos.map((g) => g.id);
}

module.exports = { nomeCompleto, subcategoriaAtiva, expandirCategorias, gruposDoUsuario };
