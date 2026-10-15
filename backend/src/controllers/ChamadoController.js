// src/controllers/ChamadoController.js
const { Op, literal, where: condicaoSql } = require('sequelize');
const Chamado = require('../models/Chamado');
const Usuario = require('../models/Usuario');
const Interacao = require('../models/Interacao');
const Grupo = require('../models/Grupo');
const {
  STATUS_CHAMADO, PRIORIDADES, ROTULO_PRIORIDADE, METAS_SLA, isEquipe,
} = require('../config/perfis');
const { texto, validarChamado, validarDadosOpcionais } = require('../utils/validacao');
const { validarRespostas } = require('../services/formulario');
const { registrarEvento } = require('../services/eventos');
const {
  calcularSla, calcularPrazos, horasSla, prazoSolucaoSql,
} = require('../services/sla');
const {
  nomeCompleto, subcategoriaAtiva, expandirCategorias, gruposDoUsuario,
} = require('../services/catalogo');

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
const MOTIVO_MAX = 500;

// Dados relacionados que acompanham o chamado nas respostas da API
const RELACIONADOS = [
  { association: 'usuario', attributes: USUARIO_RESUMIDO },
  { association: 'responsavel', attributes: USUARIO_RESUMIDO },
  { association: 'grupo', attributes: ['id', 'nome'] },
  {
    association: 'categoria',
    attributes: ['id', 'nome', 'parent_id'],
    include: { association: 'pai', attributes: ['id', 'nome', 'icone'] },
  },
];

// Recarrega o chamado com os relacionados, depois de uma alteração
const recarregar = (id) => Chamado.findByPk(id, { include: RELACIONADOS });

const PENDENTE = { status: { [Op.ne]: 'resolvido' } };

// Condições SQL da situação do prazo de solução (só faz sentido para pendentes)
const prazoEstourado = (agora) => condicaoSql(prazoSolucaoSql(), Op.lt, agora);
const prazoEmRisco = (agora) => ({
  [Op.and]: [condicaoSql(prazoSolucaoSql(0.75), Op.lte, agora), condicaoSql(prazoSolucaoSql(), Op.gte, agora)],
});

// Chamado no formato da API: dados + situação dos prazos
const comSla = (chamado) => ({ ...chamado.toJSON(), sla: calcularSla(chamado) });

const ids = (valor) =>
  String(valor || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);

// Monta o WHERE da listagem a partir da query string.
// Ex.: /chamados?status=aberto,em andamento&prioridade=alta&categoria=3&grupo=meus&sla=estourado&busca=vpn
async function montarFiltros(query, usuario, agora) {
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

  // Categoria principal inclui todas as suas subcategorias
  const categorias = ids(query.categoria);
  if (categorias.length) where.categoria_id = await expandirCategorias(categorias);

  if (query.grupo === 'meus') where.grupo_id = await gruposDoUsuario(usuario.id);
  else if (query.grupo === 'nenhum') where.grupo_id = null;
  else if (ids(query.grupo).length) where.grupo_id = ids(query.grupo);

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
  const equipe = isEquipe(usuario);
  const escopo = equipe ? {} : { usuario_id: usuario.id };
  const meusGrupos = equipe ? await gruposDoUsuario(usuario.id) : [];

  const [todos, pendentes, resolvidos, atribuidosAMim, semResponsavel, atrasados, doMeuGrupo] = await Promise.all([
    Chamado.count({ where: escopo }),
    Chamado.count({ where: { ...escopo, ...PENDENTE } }),
    Chamado.count({ where: { ...escopo, status: 'resolvido' } }),
    Chamado.count({ where: { ...escopo, ...PENDENTE, responsavel_id: usuario.id } }),
    Chamado.count({ where: { ...escopo, ...PENDENTE, responsavel_id: null } }),
    Chamado.count({ where: { ...escopo, [Op.and]: [PENDENTE, prazoEstourado(agora)] } }),
    meusGrupos.length ? Chamado.count({ where: { ...PENDENTE, grupo_id: meusGrupos } }) : 0,
  ]);

  return {
    todos, pendentes, resolvidos, atribuidosAMim, semResponsavel, atrasados, doMeuGrupo,
  };
}

module.exports = {
  // Lista com filtros, busca, ordenação e paginação
  async index(req, res) {
    const agora = new Date();
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const porPagina = Math.min(POR_PAGINA_MAX, Math.max(1, parseInt(req.query.porPagina, 10) || POR_PAGINA_PADRAO));
    const order = ORDENACOES[req.query.ordem] || ORDENACOES.recentes;

    const where = await montarFiltros(req.query, req.user, agora);
    const [{ rows, count }, contadores] = await Promise.all([
      Chamado.findAndCountAll({
        where,
        include: RELACIONADOS,
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
        // No detalhe, o solicitante vem com setor e cargo
        { association: 'usuario', attributes: [...USUARIO_RESUMIDO, 'setor', 'cargo'] },
        ...RELACIONADOS.filter((r) => r.association !== 'usuario'),
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

  // Abre um chamado. A subcategoria escolhida define prioridade, prazos e
  // grupo; o solicitante não informa prioridade (ela é ignorada se vier).
  async store(req, res) {
    const erro = validarChamado(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const sub = await subcategoriaAtiva(req.body.categoria_id);
    if (!sub) {
      return res.status(400).json({ error: 'Escolha uma subcategoria válida do catálogo ("categoria_id").' });
    }

    // Respostas do formulário específico da subcategoria
    const respostas = validarRespostas(sub.campos, req.body.respostas ?? {});
    if (respostas.erro) return res.status(400).json({ error: respostas.erro });

    // Contato e local: o que veio no formulário, ou o cadastro do funcionário
    const contato = validarDadosOpcionais(req.body, ['contato', 'local']);
    if (contato.erro) return res.status(400).json({ error: contato.erro });

    const prioridade = sub.prioridade || 'media';
    const horas = horasSla(sub, prioridade);
    const agora = new Date();

    const chamado = await Chamado.create({
      titulo: texto(req.body.titulo),
      descricao: texto(req.body.descricao),
      contato: contato.dados.contato !== undefined ? contato.dados.contato : req.user.ramal,
      local: contato.dados.local !== undefined ? contato.dados.local : req.user.localizacao,
      respostas: respostas.valor,
      status: 'aberto',
      prioridade,
      categoria_id: sub.id,
      grupo_id: sub.grupo_id ?? sub.pai.grupo_id ?? null,
      usuario_id: req.userId,
      createdAt: agora,
      ...calcularPrazos(agora, horas.resposta, horas.solucao),
    });

    return res.status(201).json(comSla(await recarregar(chamado.id)));
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
      return res.json(comSla(await recarregar(chamado.id)));
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

    return res.json(comSla(await recarregar(chamado.id)));
  },

  // Altera a prioridade (somente equipe). Os prazos passam a seguir as metas
  // da nova prioridade, contadas da abertura.
  async updatePrioridade(req, res) {
    const { prioridade } = req.body;
    const { chamado, user } = req;

    if (!PRIORIDADES.includes(prioridade)) {
      return res.status(400).json({ error: `Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.` });
    }

    if (prioridade !== chamado.prioridade) {
      const anterior = chamado.prioridade;
      chamado.prioridade = prioridade;
      Object.assign(chamado, calcularPrazos(chamado.createdAt, METAS_SLA[prioridade].resposta, METAS_SLA[prioridade].solucao));
      await chamado.save();
      await registrarEvento(
        chamado.id, user.id,
        `alterou a prioridade de ${ROTULO_PRIORIDADE[anterior]} para ${ROTULO_PRIORIDADE[prioridade]}`
      );
    }

    return res.json(comSla(await recarregar(chamado.id)));
  },

  // Reclassifica o chamado em outra subcategoria (somente equipe).
  // Prioridade e prazos passam a ser os da nova subcategoria, contados da
  // abertura. Grupo e responsável não mudam (para isso existe a transferência).
  async updateCategoria(req, res) {
    const { chamado, user } = req;
    const sub = await subcategoriaAtiva(req.body.categoria_id);
    if (!sub) {
      return res.status(400).json({ error: 'Escolha uma subcategoria válida do catálogo ("categoria_id").' });
    }

    if (sub.id !== chamado.categoria_id) {
      const anterior = await chamado.getCategoria({ include: { association: 'pai' } });
      const prioridadeAnterior = chamado.prioridade;
      const prioridade = sub.prioridade || 'media';
      const horas = horasSla(sub, prioridade);

      chamado.categoria_id = sub.id;
      chamado.prioridade = prioridade;
      Object.assign(chamado, calcularPrazos(chamado.createdAt, horas.resposta, horas.solucao));
      await chamado.save();

      let mensagem = `alterou a categoria de ${nomeCompleto(anterior)} para ${nomeCompleto(sub)}`;
      if (prioridade !== prioridadeAnterior) mensagem += ` (prioridade ${ROTULO_PRIORIDADE[prioridade]})`;
      await registrarEvento(chamado.id, user.id, mensagem);
    }

    return res.json(comSla(await recarregar(chamado.id)));
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
      return res.json(comSla(await recarregar(chamado.id)));
    }

    chamado.responsavel_id = novoId;
    await chamado.save();

    let mensagem;
    if (!responsavel) mensagem = 'removeu o responsável do chamado';
    else if (responsavel.id === user.id) mensagem = 'assumiu o chamado';
    else mensagem = `atribuiu o chamado a ${responsavel.nome}`;
    await registrarEvento(chamado.id, user.id, mensagem);

    return res.json(comSla(await recarregar(chamado.id)));
  },

  // Transfere o chamado para outro grupo e/ou técnico, com motivo obrigatório.
  // Corpo: { grupo_id?, responsavel_id?, motivo }.
  // - mudando só o grupo, o chamado volta para a fila do grupo (sem responsável)
  // - vindo grupo e técnico, o técnico precisa ser membro do grupo
  async transferir(req, res) {
    const { chamado, user } = req;
    const { grupo_id: grupoId, responsavel_id: responsavelId } = req.body;
    const motivo = texto(req.body.motivo);

    if (motivo.length < 3) {
      return res.status(400).json({ error: 'Informe o motivo da transferência.' });
    }
    if (motivo.length > MOTIVO_MAX) {
      return res.status(400).json({ error: `O motivo deve ter no máximo ${MOTIVO_MAX} caracteres.` });
    }
    const informouGrupo = grupoId !== undefined && grupoId !== null;
    const informouResponsavel = responsavelId !== undefined && responsavelId !== null;
    if (!informouGrupo && !informouResponsavel) {
      return res.status(400).json({ error: 'Informe o grupo e/ou o técnico de destino.' });
    }

    let grupo = null;
    if (informouGrupo) {
      grupo = Number.isInteger(grupoId) ? await Grupo.findByPk(grupoId) : null;
      if (!grupo || !grupo.ativo) return res.status(400).json({ error: 'Grupo de destino não encontrado.' });
    }

    let responsavel = null;
    if (informouResponsavel) {
      responsavel = Number.isInteger(responsavelId)
        ? await Usuario.findByPk(responsavelId, { attributes: USUARIO_RESUMIDO.concat('ativo') })
        : null;
      if (!responsavel || !responsavel.ativo || !isEquipe(responsavel)) {
        return res.status(400).json({ error: 'O técnico precisa ser um usuário ativo da equipe (suporte ou admin).' });
      }
      if (grupo && !(await grupo.hasMembro(responsavel.id))) {
        return res.status(400).json({ error: `${responsavel.nome} não faz parte do grupo ${grupo.nome}.` });
      }
    }

    const novoGrupo = grupo ? grupo.id : chamado.grupo_id;
    // Mudou de grupo sem técnico definido: volta para a fila do novo grupo
    let novoResponsavel = responsavel ? responsavel.id : chamado.responsavel_id;
    if (grupo && !responsavel && grupo.id !== chamado.grupo_id) novoResponsavel = null;

    if (novoGrupo === chamado.grupo_id && novoResponsavel === chamado.responsavel_id) {
      return res.status(400).json({ error: 'O chamado já está com esse grupo e técnico.' });
    }

    chamado.grupo_id = novoGrupo;
    chamado.responsavel_id = novoResponsavel;
    await chamado.save();

    const destino = [grupo?.nome, responsavel?.nome].filter(Boolean).join(' / ');
    await registrarEvento(chamado.id, user.id, `transferiu o chamado para ${destino}. Motivo: ${motivo}`);

    return res.json(comSla(await recarregar(chamado.id)));
  },

  // Técnicos ativos que podem receber chamados, com os grupos de cada um
  async equipe(req, res) {
    const membros = await Usuario.findAll({
      where: { perfil: ['suporte', 'admin'], ativo: true },
      attributes: ['id', 'nome', 'perfil'],
      include: {
        association: 'grupos', attributes: ['id', 'nome'], where: { ativo: true }, required: false, through: { attributes: [] },
      },
      order: [['nome', 'ASC'], [{ model: Grupo, as: 'grupos' }, 'id', 'ASC']],
    });
    return res.json(membros);
  },
};
