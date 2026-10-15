// src/controllers/ChamadoController.js
const { Op, literal, where: condicaoSql } = require('sequelize');
const Chamado = require('../models/Chamado');
const Usuario = require('../models/Usuario');
const Interacao = require('../models/Interacao');
const {
  STATUS_CHAMADO, PRIORIDADES, ROTULO_PRIORIDADE, CATEGORIAS, isEquipe,
} = require('../config/perfis');
const { texto, validarChamado } = require('../utils/validacao');
const { registrarEvento } = require('../services/eventos');
const { calcularSla, prazoSolucaoSql } = require('../services/sla');

// Status que o próprio dono (perfil comum) pode definir:
// encerrar o chamado ou reabri-lo. "em andamento" é só da equipe.
const STATUS_PERMITIDOS_DONO = ['aberto', 'resolvido'];

const POR_PAGINA_PADRAO = 15;
const POR_PAGINA_MAX = 50;

const ORDENACOES = {
  recentes: [['createdAt', 'DESC']],
  antigos: [['createdAt', 'ASC']],
  atualizados: [['updatedAt', 'DESC']],
  prioridade: [
    [literal(`FIELD(\`Chamado\`.\`prioridade\`, ${PRIORIDADES.map((p) => `'${p}'`).join(', ')})`), 'ASC'],
    ['createdAt', 'ASC'],
  ],
  // Vencimento do prazo de solução: os mais atrasados primeiro
  prazo: [[prazoSolucaoSql(), 'ASC'], ['createdAt', 'ASC']],
};

const USUARIO_RESUMIDO = ['id', 'nome', 'email', 'perfil'];

const PENDENTE = { status: { [Op.ne]: 'resolvido' } };

// Condições SQL da situação do prazo de solução (só faz sentido para pendentes)
const prazoEstourado = (agora) => condicaoSql(prazoSolucaoSql(), Op.lt, agora);
const prazoEmRisco = (agora) => ({
  [Op.and]: [condicaoSql(prazoSolucaoSql(0.75), Op.lte, agora), condicaoSql(prazoSolucaoSql(), Op.gte, agora)],
});

// Chamado no formato da API: dados + situação dos prazos
const comSla = (chamado) => ({ ...chamado.toJSON(), sla: calcularSla(chamado) });

// Monta o WHERE da listagem a partir da query string.
// Ex.: /chamados?status=aberto,em andamento&prioridade=alta&categoria=rede&sla=estourado&busca=vpn
function montarFiltros(query, usuario, agora) {
  const where = {};
  const e = [];

  // Perfil comum só enxerga os próprios chamados, independentemente dos filtros
  if (!isEquipe(usuario)) {
    where.usuario_id = usuario.id;
  }

  const lista = (valor, permitidos) =>
    String(valor || '').split(',').map((v) => v.trim()).filter((v) => permitidos.includes(v));

  const status = lista(query.status, STATUS_CHAMADO);
  if (status.length) where.status = status;

  const prioridades = lista(query.prioridade, PRIORIDADES);
  if (prioridades.length) where.prioridade = prioridades;

  const categorias = lista(query.categoria, Object.keys(CATEGORIAS));
  if (categorias.length) where.categoria = categorias;

  if (query.responsavel === 'eu') where.responsavel_id = usuario.id;
  else if (query.responsavel === 'nenhum') where.responsavel_id = null;
  else if (Number(query.responsavel) > 0) where.responsavel_id = Number(query.responsavel);

  if (query.sla === 'estourado') e.push(PENDENTE, prazoEstourado(agora));
  else if (query.sla === 'em_risco') e.push(PENDENTE, prazoEmRisco(agora));

  const busca = texto(query.busca);
  if (busca) {
    const termo = `%${busca}%`;
    const condicoes = [
      { titulo: { [Op.like]: termo } },
      { descricao: { [Op.like]: termo } },
    ];
    // "CH-0012", "#12" ou "12" também encontram o chamado pelo número
    const numero = Number(busca.replace(/^(#|ch-?)/i, ''));
    if (Number.isInteger(numero) && numero > 0) condicoes.push({ id: numero });
    e.push({ [Op.or]: condicoes });
  }

  if (e.length) where[Op.and] = e;
  return where;
}

// Contadores das abas rápidas da lista (respeitam só o escopo do perfil)
async function contarAbas(usuario, agora) {
  const escopo = isEquipe(usuario) ? {} : { usuario_id: usuario.id };

  const [todos, pendentes, resolvidos, atribuidosAMim, semResponsavel, atrasados] = await Promise.all([
    Chamado.count({ where: escopo }),
    Chamado.count({ where: { ...escopo, ...PENDENTE } }),
    Chamado.count({ where: { ...escopo, status: 'resolvido' } }),
    Chamado.count({ where: { ...escopo, ...PENDENTE, responsavel_id: usuario.id } }),
    Chamado.count({ where: { ...escopo, ...PENDENTE, responsavel_id: null } }),
    Chamado.count({ where: { ...escopo, [Op.and]: [PENDENTE, prazoEstourado(agora)] } }),
  ]);

  return { todos, pendentes, resolvidos, atribuidosAMim, semResponsavel, atrasados };
}

module.exports = {
  // Lista com filtros, busca, ordenação e paginação
  async index(req, res) {
    const agora = new Date();
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const porPagina = Math.min(POR_PAGINA_MAX, Math.max(1, parseInt(req.query.porPagina, 10) || POR_PAGINA_PADRAO));
    const order = ORDENACOES[req.query.ordem] || ORDENACOES.recentes;

    const [{ rows, count }, contadores] = await Promise.all([
      Chamado.findAndCountAll({
        where: montarFiltros(req.query, req.user, agora),
        include: [
          { association: 'usuario', attributes: USUARIO_RESUMIDO },
          { association: 'responsavel', attributes: USUARIO_RESUMIDO },
        ],
        order,
        limit: porPagina,
        offset: (pagina - 1) * porPagina,
        distinct: true,
      }),
      contarAbas(req.user, agora),
    ]);

    return res.json({
      dados: rows.map(comSla),
      total: count,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(count / porPagina)),
      contadores,
    });
  },

  // Detalhes do chamado, com timeline (mensagens, notas e eventos) e anexos.
  // O acesso já foi validado pelo middleware chamadoAccess.
  async show(req, res) {
    const chamado = await Chamado.findByPk(req.chamado.id, {
      include: [
        { association: 'usuario', attributes: USUARIO_RESUMIDO },
        { association: 'responsavel', attributes: USUARIO_RESUMIDO },
        {
          association: 'interacoes',
          // Notas internas só aparecem para a equipe
          where: isEquipe(req.user) ? undefined : { tipo: { [Op.ne]: 'nota' } },
          required: false,
          include: { association: 'usuario', attributes: ['id', 'nome', 'perfil'] },
        },
        { association: 'anexos', attributes: ['id', 'nome_original', 'createdAt'] },
      ],
      order: [[{ model: Interacao, as: 'interacoes' }, 'createdAt', 'ASC'], [{ model: Interacao, as: 'interacoes' }, 'id', 'ASC']],
    });

    return res.json(comSla(chamado));
  },

  async store(req, res) {
    const erro = validarChamado(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const prioridade = req.body.prioridade || 'media';
    if (!PRIORIDADES.includes(prioridade)) {
      return res.status(400).json({ error: `Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.` });
    }

    const categoria = req.body.categoria || 'outros';
    if (!CATEGORIAS[categoria]) {
      return res.status(400).json({ error: `Categoria inválida. Use: ${Object.keys(CATEGORIAS).join(', ')}.` });
    }

    const chamado = await Chamado.create({
      titulo: texto(req.body.titulo),
      descricao: texto(req.body.descricao),
      status: 'aberto',
      prioridade,
      categoria,
      usuario_id: req.userId,
    });

    return res.status(201).json(comSla(chamado));
  },

  // Altera o status. Registra o evento e mantém resolvido_em atualizado.
  async update(req, res) {
    const { status } = req.body;
    const { chamado, user } = req;

    if (!STATUS_CHAMADO.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${STATUS_CHAMADO.join(', ')}.` });
    }

    if (!isEquipe(user) && !STATUS_PERMITIDOS_DONO.includes(status)) {
      return res.status(403).json({ error: 'Apenas a equipe de suporte pode colocar o chamado em andamento.' });
    }

    if (status === chamado.status) {
      return res.json(comSla(chamado));
    }

    const anterior = chamado.status;
    chamado.status = status;
    chamado.resolvido_em = status === 'resolvido' ? new Date() : null;

    // Quem da equipe começa a atender um chamado sem dono passa a ser o responsável
    const assumiu = status === 'em andamento' && isEquipe(user) && !chamado.responsavel_id;
    if (assumiu) chamado.responsavel_id = user.id;

    await chamado.save();
    await registrarEvento(chamado.id, user.id, `alterou o status de "${anterior}" para "${status}"`);
    if (assumiu) await registrarEvento(chamado.id, user.id, 'assumiu o chamado');

    return res.json(comSla(chamado));
  },

  // Altera a prioridade (somente equipe). Os prazos de SLA passam a seguir a nova prioridade.
  async updatePrioridade(req, res) {
    const { prioridade } = req.body;
    const { chamado, user } = req;

    if (!PRIORIDADES.includes(prioridade)) {
      return res.status(400).json({ error: `Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.` });
    }

    if (prioridade !== chamado.prioridade) {
      const anterior = chamado.prioridade;
      chamado.prioridade = prioridade;
      await chamado.save();
      await registrarEvento(
        chamado.id, user.id,
        `alterou a prioridade de ${ROTULO_PRIORIDADE[anterior]} para ${ROTULO_PRIORIDADE[prioridade]}`
      );
    }

    return res.json(comSla(chamado));
  },

  // Altera a categoria (somente equipe)
  async updateCategoria(req, res) {
    const { categoria } = req.body;
    const { chamado, user } = req;

    if (!CATEGORIAS[categoria]) {
      return res.status(400).json({ error: `Categoria inválida. Use: ${Object.keys(CATEGORIAS).join(', ')}.` });
    }

    if (categoria !== chamado.categoria) {
      const anterior = chamado.categoria;
      chamado.categoria = categoria;
      await chamado.save();
      await registrarEvento(
        chamado.id, user.id,
        `alterou a categoria de ${CATEGORIAS[anterior] || anterior} para ${CATEGORIAS[categoria]}`
      );
    }

    return res.json(comSla(chamado));
  },

  // Define o responsável (somente equipe). responsavel_id: null remove.
  async updateResponsavel(req, res) {
    const { chamado, user } = req;
    const { responsavel_id: novoId } = req.body;

    if (novoId !== null && !(Number.isInteger(novoId) && novoId > 0)) {
      return res.status(400).json({ error: 'Informe "responsavel_id" com o ID de um técnico, ou null para remover.' });
    }

    let responsavel = null;
    if (novoId !== null) {
      responsavel = await Usuario.findByPk(novoId, { attributes: USUARIO_RESUMIDO.concat('ativo') });
      if (!responsavel || !responsavel.ativo || !isEquipe(responsavel)) {
        return res.status(400).json({ error: 'O responsável precisa ser um usuário ativo da equipe (suporte ou admin).' });
      }
    }

    if (novoId === chamado.responsavel_id) {
      return res.json(comSla(chamado));
    }

    chamado.responsavel_id = novoId;
    await chamado.save();

    let mensagem;
    if (!responsavel) mensagem = 'removeu o responsável do chamado';
    else if (responsavel.id === user.id) mensagem = 'assumiu o chamado';
    else mensagem = `atribuiu o chamado a ${responsavel.nome}`;
    await registrarEvento(chamado.id, user.id, mensagem);

    return res.json(comSla(chamado));
  },

  // Técnicos ativos que podem receber chamados (para o seletor de responsável)
  async equipe(req, res) {
    const membros = await Usuario.findAll({
      where: { perfil: ['suporte', 'admin'], ativo: true },
      attributes: ['id', 'nome', 'perfil'],
      order: [['nome', 'ASC']],
    });
    return res.json(membros);
  },
};
