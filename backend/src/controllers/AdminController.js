// src/controllers/AdminController.js
const { fn, col, Op, QueryTypes } = require('sequelize');
const Chamado = require('../models/Chamado');
const Usuario = require('../models/Usuario');
const { STATUS_CHAMADO, PERFIS, PRIORIDADES } = require('../config/perfis');

const DIAS_GRAFICO = 14;
const DIAS_METRICAS = 30;

// Transforma o resultado de um GROUP BY em { valor: quantidade },
// garantindo zero para as chaves que não apareceram.
function contarPor(linhas, campo, chaves) {
  const resultado = Object.fromEntries(chaves.map((chave) => [chave, 0]));
  linhas.forEach((linha) => {
    resultado[linha[campo]] = Number(linha.total);
  });
  return resultado;
}

// Data "AAAA-MM-DD" no fuso do usuário (fuso = minutos de Date.getTimezoneOffset())
function dataLocal(ms, fuso) {
  return new Date(ms - fuso * 60000).toISOString().slice(0, 10);
}

module.exports = {
  // Indicadores e dados dos gráficos da tela de administração.
  // ?fuso=180 faz os dias do gráfico seguirem o horário de Brasília (UTC-3).
  async resumo(req, res) {
    const fuso = Number.isFinite(Number(req.query.fuso)) ? Number(req.query.fuso) : 0;
    const sequelize = Chamado.sequelize;
    const agora = Date.now();
    const inicioGrafico = new Date(agora - DIAS_GRAFICO * 86400000);
    const inicioMetricas = new Date(agora - DIAS_METRICAS * 86400000);

    const [
      chamadosPorStatus, pendentesPorPrioridade, usuariosPorPerfil, usuariosInativos,
      maisAntigos, abertosNoPeriodo, resolvidosNoPeriodo, tempoMedio, equipe,
    ] = await Promise.all([
      Chamado.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'total']],
        group: ['status'],
        raw: true,
      }),
      Chamado.findAll({
        attributes: ['prioridade', [fn('COUNT', col('id')), 'total']],
        where: { status: { [Op.ne]: 'resolvido' } },
        group: ['prioridade'],
        raw: true,
      }),
      Usuario.findAll({
        attributes: ['perfil', [fn('COUNT', col('id')), 'total']],
        where: { ativo: true },
        group: ['perfil'],
        raw: true,
      }),
      Usuario.count({ where: { ativo: false } }),
      Chamado.findAll({
        where: { status: { [Op.ne]: 'resolvido' } },
        attributes: ['id', 'titulo', 'status', 'prioridade', 'createdAt'],
        include: [
          { association: 'usuario', attributes: ['id', 'nome'] },
          { association: 'responsavel', attributes: ['id', 'nome'] },
        ],
        order: [['createdAt', 'ASC']],
        limit: 5,
      }),
      Chamado.findAll({ where: { createdAt: { [Op.gte]: inicioGrafico } }, attributes: ['createdAt'], raw: true }),
      Chamado.findAll({ where: { resolvido_em: { [Op.gte]: inicioGrafico } }, attributes: ['resolvido_em'], raw: true }),
      sequelize.query(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, resolvido_em)) AS minutos, COUNT(*) AS total
           FROM chamados WHERE resolvido_em >= :inicio`,
        { replacements: { inicio: inicioMetricas }, type: QueryTypes.SELECT }
      ),
      // Desempenho de cada técnico ativo
      sequelize.query(
        `SELECT u.id, u.nome, u.perfil,
                SUM(c.status <> 'resolvido') AS pendentes,
                SUM(c.resolvido_em >= :inicio) AS resolvidos,
                AVG(CASE WHEN c.resolvido_em >= :inicio
                         THEN TIMESTAMPDIFF(MINUTE, c.created_at, c.resolvido_em) END) AS minutos_medios
           FROM usuarios u
           LEFT JOIN chamados c ON c.responsavel_id = u.id
          WHERE u.perfil IN ('suporte', 'admin') AND u.ativo = 1
          GROUP BY u.id, u.nome, u.perfil
          ORDER BY resolvidos DESC, u.nome ASC`,
        { replacements: { inicio: inicioMetricas }, type: QueryTypes.SELECT }
      ),
    ]);

    // Série diária (abertos x resolvidos) nos últimos 14 dias, inclusive dias zerados
    const dias = [];
    for (let i = DIAS_GRAFICO - 1; i >= 0; i -= 1) {
      dias.push({ data: dataLocal(agora - i * 86400000, fuso), abertos: 0, resolvidos: 0 });
    }
    const porData = Object.fromEntries(dias.map((d) => [d.data, d]));
    abertosNoPeriodo.forEach(({ createdAt }) => {
      const dia = porData[dataLocal(new Date(createdAt).getTime(), fuso)];
      if (dia) dia.abertos += 1;
    });
    resolvidosNoPeriodo.forEach(({ resolvido_em: resolvidoEm }) => {
      const dia = porData[dataLocal(new Date(resolvidoEm).getTime(), fuso)];
      if (dia) dia.resolvidos += 1;
    });

    const porStatus = contarPor(chamadosPorStatus, 'status', STATUS_CHAMADO);
    const porPerfil = contarPor(usuariosPorPerfil, 'perfil', PERFIS);
    const minutosMedios = tempoMedio[0].minutos === null ? null : Number(tempoMedio[0].minutos);

    return res.json({
      chamados: {
        total: Object.values(porStatus).reduce((soma, n) => soma + n, 0),
        porStatus,
        pendentesPorPrioridade: contarPor(pendentesPorPrioridade, 'prioridade', PRIORIDADES),
        semResponsavel: await Chamado.count({ where: { status: { [Op.ne]: 'resolvido' }, responsavel_id: null } }),
      },
      resolucao: {
        periodoDias: DIAS_METRICAS,
        resolvidos: Number(tempoMedio[0].total),
        horasMedias: minutosMedios === null ? null : Math.round((minutosMedios / 60) * 10) / 10,
      },
      porDia: dias,
      equipe: equipe.map((m) => ({
        id: m.id,
        nome: m.nome,
        perfil: m.perfil,
        pendentes: Number(m.pendentes || 0),
        resolvidos: Number(m.resolvidos || 0),
        horasMedias: m.minutos_medios === null ? null : Math.round((Number(m.minutos_medios) / 60) * 10) / 10,
      })),
      usuarios: {
        ativos: Object.values(porPerfil).reduce((soma, n) => soma + n, 0),
        inativos: usuariosInativos,
        porPerfil,
      },
      pendentesMaisAntigos: maisAntigos,
    });
  },
};
