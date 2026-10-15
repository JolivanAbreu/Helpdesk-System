// src/controllers/CategoriaController.js
// Catálogo de serviços: categorias e subcategorias.
// A subcategoria define a prioridade, os prazos de SLA e o grupo que recebe
// os chamados. Alterações valem só para chamados abertos depois delas.
const { Op } = require('sequelize');
const Categoria = require('../models/Categoria');
const Grupo = require('../models/Grupo');
const { PRIORIDADES, METAS_SLA } = require('../config/perfis');
const { texto } = require('../utils/validacao');
const { LIMITES, validarLista, validarCampos } = require('../services/formulario');

const ICONES = ['hardware', 'software', 'rede', 'acessos', 'email', 'outros'];
const HORAS_MAX = 2000;

const ATRIBUTOS = [
  'id', 'nome', 'descricao', 'icone', 'parent_id', 'prioridade', 'sla_resposta_horas', 'sla_solucao_horas', 'grupo_id', 'ativo',
  'palavras_chave', 'sugestoes', 'modelo_descricao', 'campos',
];

// Ordem alfabética, com os itens "Outros..." sempre no fim
const ordenar = (lista) => lista.sort((a, b) => (
  (a.nome.startsWith('Outros') - b.nome.startsWith('Outros')) || a.nome.localeCompare(b.nome, 'pt-BR')
));

// Árvore: categorias principais com as subcategorias e o grupo de cada uma
async function arvore(incluirInativas) {
  const ativo = incluirInativas ? {} : { ativo: true };
  const categorias = await Categoria.findAll({
    where: { parent_id: null, ...ativo },
    attributes: ATRIBUTOS,
    include: [
      { association: 'grupo', attributes: ['id', 'nome'] },
      {
        association: 'subcategorias',
        attributes: ATRIBUTOS,
        where: incluirInativas ? undefined : { ativo: true },
        required: false,
        include: { association: 'grupo', attributes: ['id', 'nome'] },
      },
    ],
  });
  return ordenar(categorias.map((c) => {
    const json = c.toJSON();
    return { ...json, subcategorias: ordenar(json.subcategorias) };
  }));
}

const horasValidas = (h) => typeof h === 'number' && Number.isFinite(h) && h > 0 && h <= HORAS_MAX;

// Valida os campos enviados (criação ou edição) e devolve { erro } ou { dados }.
// "atual" é o registro existente, na edição.
async function validar(corpo, { ehSubcategoria, atual }) {
  const dados = {};

  if (corpo.nome !== undefined || !atual) {
    const nome = texto(corpo.nome);
    if (nome.length < 2 || nome.length > 100) return { erro: 'Informe o nome (de 2 a 100 caracteres).' };
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
  if (corpo.grupo_id !== undefined) {
    if (corpo.grupo_id !== null) {
      const grupo = Number.isInteger(corpo.grupo_id) ? await Grupo.findByPk(corpo.grupo_id) : null;
      if (!grupo) return { erro: 'Grupo não encontrado.' };
    }
    dados.grupo_id = corpo.grupo_id;
  }

  // Palavras-chave ajudam a busca a achar também as categorias principais
  if (corpo.palavras_chave !== undefined) {
    const lista = validarLista(corpo.palavras_chave, { max: LIMITES.palavras, maxItem: LIMITES.palavra, nome: 'palavras_chave' });
    if (lista.erro) return { erro: lista.erro };
    dados.palavras_chave = lista.valor;
  }

  if (!ehSubcategoria) {
    if (corpo.icone !== undefined) {
      if (!ICONES.includes(corpo.icone)) return { erro: `Ícone inválido. Use: ${ICONES.join(', ')}.` };
      dados.icone = corpo.icone;
    }
    return { dados };
  }

  if (corpo.prioridade !== undefined || !atual) {
    if (!PRIORIDADES.includes(corpo.prioridade)) {
      return { erro: `Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.` };
    }
    dados.prioridade = corpo.prioridade;
  }

  // Sem prazos informados na criação, valem as metas da prioridade
  const meta = METAS_SLA[dados.prioridade || atual?.prioridade];
  const resposta = corpo.sla_resposta_horas ?? (atual ? atual.sla_resposta_horas : meta.resposta);
  const solucao = corpo.sla_solucao_horas ?? (atual ? atual.sla_solucao_horas : meta.solucao);
  if (!horasValidas(resposta) || !horasValidas(solucao)) {
    return { erro: `Os prazos devem ser números de horas entre 0 e ${HORAS_MAX}.` };
  }
  if (resposta > solucao) {
    return { erro: 'O prazo de resposta não pode ser maior que o de solução.' };
  }
  dados.sla_resposta_horas = resposta;
  dados.sla_solucao_horas = solucao;

  // Formulário de abertura
  if (corpo.sugestoes !== undefined) {
    const lista = validarLista(corpo.sugestoes, { max: LIMITES.sugestoes, maxItem: LIMITES.sugestao, nome: 'sugestoes' });
    if (lista.erro) return { erro: lista.erro };
    dados.sugestoes = lista.valor;
  }
  if (corpo.modelo_descricao !== undefined) {
    if (corpo.modelo_descricao !== null && typeof corpo.modelo_descricao !== 'string') {
      return { erro: 'Informe "modelo_descricao" como texto.' };
    }
    const modelo = (corpo.modelo_descricao || '').trim();
    if (modelo.length > LIMITES.modelo) return { erro: `O modelo de descrição deve ter no máximo ${LIMITES.modelo} caracteres.` };
    dados.modelo_descricao = modelo || null;
  }
  if (corpo.campos !== undefined) {
    const campos = validarCampos(corpo.campos);
    if (campos.erro) return { erro: campos.erro };
    dados.campos = campos.valor;
  }

  return { dados };
}

async function nomeEmUso(nome, parentId, ignorarId) {
  return Categoria.count({
    where: { nome, parent_id: parentId, ...(ignorarId ? { id: { [Op.ne]: ignorarId } } : {}) },
  });
}

module.exports = {
  // Árvore do catálogo. ?inativas=1 (só admin) inclui os itens desativados.
  async index(req, res) {
    const incluirInativas = req.query.inativas === '1' && req.user.perfil === 'admin';
    return res.json(await arvore(incluirInativas));
  },

  // Cria categoria principal (sem parent_id) ou subcategoria
  async store(req, res) {
    const parentId = req.body.parent_id ?? null;
    let pai = null;
    if (parentId !== null) {
      pai = Number.isInteger(parentId) ? await Categoria.findByPk(parentId) : null;
      if (!pai || pai.parent_id !== null) {
        return res.status(400).json({ error: 'A categoria principal informada não existe.' });
      }
    }

    const { erro, dados } = await validar(req.body, { ehSubcategoria: Boolean(pai) });
    if (erro) return res.status(400).json({ error: erro });

    if (await nomeEmUso(dados.nome, parentId)) {
      return res.status(409).json({ error: 'Já existe um item com esse nome neste nível do catálogo.' });
    }

    const categoria = await Categoria.create({
      ...dados,
      parent_id: parentId,
      icone: pai ? null : dados.icone || 'outros',
      // A subcategoria herda o grupo da categoria principal, se não vier um
      grupo_id: dados.grupo_id !== undefined ? dados.grupo_id : pai?.grupo_id ?? null,
    });
    return res.status(201).json(await Categoria.findByPk(categoria.id, { attributes: ATRIBUTOS }));
  },

  async update(req, res) {
    const categoria = await Categoria.findByPk(Number(req.params.categoria_id));
    if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const ehSubcategoria = categoria.parent_id !== null;
    const { erro, dados } = await validar(req.body, { ehSubcategoria, atual: categoria });
    if (erro) return res.status(400).json({ error: erro });

    if (dados.nome && await nomeEmUso(dados.nome, categoria.parent_id, categoria.id)) {
      return res.status(409).json({ error: 'Já existe um item com esse nome neste nível do catálogo.' });
    }

    await categoria.update(dados);
    return res.json(await Categoria.findByPk(categoria.id, { attributes: ATRIBUTOS }));
  },
};
