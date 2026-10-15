// src/controllers/GrupoController.js
// Grupos técnicos (filas de atendimento) e seus membros.
const { Op } = require('sequelize');
const Grupo = require('../models/Grupo');
const Usuario = require('../models/Usuario');
const Chamado = require('../models/Chamado');
const { PERFIS_EQUIPE } = require('../config/perfis');
const { texto } = require('../utils/validacao');

const MEMBRO = ['id', 'nome', 'email', 'perfil', 'ativo'];

async function carregar(id) {
  return Grupo.findByPk(id, {
    attributes: ['id', 'nome', 'descricao', 'ativo'],
    include: { association: 'membros', attributes: MEMBRO, through: { attributes: [] } },
    order: [[{ model: Usuario, as: 'membros' }, 'nome', 'ASC']],
  });
}

// Valida a lista de membros: IDs de usuários da equipe (suporte ou admin)
async function validarMembros(membros) {
  if (!Array.isArray(membros) || !membros.every((id) => Number.isInteger(id) && id > 0)) {
    return { erro: 'Informe "membros" como uma lista de IDs de usuários.' };
  }
  const ids = [...new Set(membros)];
  const usuarios = await Usuario.findAll({ where: { id: ids, perfil: PERFIS_EQUIPE } });
  if (usuarios.length !== ids.length) {
    return { erro: 'Os membros precisam ser usuários da equipe (suporte ou admin).' };
  }
  return { usuarios };
}

async function validar(corpo, atual) {
  const dados = {};
  if (corpo.nome !== undefined || !atual) {
    const nome = texto(corpo.nome);
    if (nome.length < 2 || nome.length > 100) return { erro: 'Informe o nome do grupo (de 2 a 100 caracteres).' };
    const emUso = await Grupo.count({ where: { nome, ...(atual ? { id: { [Op.ne]: atual.id } } : {}) } });
    if (emUso) return { erro: 'Já existe um grupo com esse nome.', status: 409 };
    dados.nome = nome;
  }
  if (corpo.descricao !== undefined) {
    const descricao = texto(corpo.descricao);
    if (descricao.length > 255) return { erro: 'A descrição deve ter no máximo 255 caracteres.' };
    dados.descricao = descricao || null;
  }
  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== 'boolean') return { erro: 'Informe "ativo" como true ou false.' };
    dados.ativo = corpo.ativo;
  }
  return { dados };
}

module.exports = {
  // Grupos com membros e quantidade de chamados pendentes na fila de cada um
  async index(req, res) {
    const [grupos, pendentes] = await Promise.all([
      Grupo.findAll({
        attributes: ['id', 'nome', 'descricao', 'ativo'],
        include: { association: 'membros', attributes: MEMBRO, through: { attributes: [] } },
        order: [['id', 'ASC'], [{ model: Usuario, as: 'membros' }, 'nome', 'ASC']],
      }),
      Chamado.count({ where: { status: { [Op.ne]: 'resolvido' } }, group: ['grupo_id'] }),
    ]);
    const porGrupo = Object.fromEntries(pendentes.map((p) => [p.grupo_id, p.count]));
    return res.json(grupos.map((g) => ({ ...g.toJSON(), pendentes: porGrupo[g.id] || 0 })));
  },

  async store(req, res) {
    const { erro, status, dados } = await validar(req.body);
    if (erro) return res.status(status || 400).json({ error: erro });

    let usuarios = [];
    if (req.body.membros !== undefined) {
      const resultado = await validarMembros(req.body.membros);
      if (resultado.erro) return res.status(400).json({ error: resultado.erro });
      usuarios = resultado.usuarios;
    }

    const grupo = await Grupo.create(dados);
    await grupo.setMembros(usuarios);
    return res.status(201).json(await carregar(grupo.id));
  },

  async update(req, res) {
    const grupo = await Grupo.findByPk(Number(req.params.grupo_id));
    if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado.' });

    const { erro, status, dados } = await validar(req.body, grupo);
    if (erro) return res.status(status || 400).json({ error: erro });

    let usuarios;
    if (req.body.membros !== undefined) {
      const resultado = await validarMembros(req.body.membros);
      if (resultado.erro) return res.status(400).json({ error: resultado.erro });
      usuarios = resultado.usuarios;
    }

    await grupo.update(dados);
    if (usuarios) await grupo.setMembros(usuarios);
    return res.json(await carregar(grupo.id));
  },
};
