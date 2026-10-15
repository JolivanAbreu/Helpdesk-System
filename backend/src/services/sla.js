// src/services/sla.js
// Cálculo dos prazos de atendimento (SLA) de um chamado.
//
// Cada chamado tem dois prazos, gravados na abertura a partir da
// subcategoria escolhida: primeira resposta da equipe e solução.
// Mudanças posteriores no catálogo não alteram chamados já abertos.
// Situações possíveis de cada prazo:
//   no_prazo  - em aberto, com folga
//   em_risco  - em aberto, já consumiu 75% ou mais do prazo
//   estourado - em aberto, prazo vencido
//   cumprido  - concluído dentro do prazo
//   violado   - concluído depois do prazo
const { literal } = require('sequelize');
const { METAS_SLA, LIMITE_RISCO_SLA } = require('../config/perfis');

const HORA = 60 * 60 * 1000;

function situacao(inicio, prazo, concluidoEm, agora) {
  if (concluidoEm) return concluidoEm <= prazo ? 'cumprido' : 'violado';
  if (agora > prazo) return 'estourado';
  if (agora - inicio >= (prazo - inicio) * LIMITE_RISCO_SLA) return 'em_risco';
  return 'no_prazo';
}

const ms = (data) => (data ? new Date(data).getTime() : null);

// Prazos gravados no chamado; se faltarem (registro antigo), calcula pela
// prioridade a partir da abertura
function prazosDoChamado(chamado) {
  const inicio = ms(chamado.createdAt);
  const meta = METAS_SLA[chamado.prioridade] || METAS_SLA.media;
  return {
    inicio,
    resposta: ms(chamado.prazo_resposta) ?? inicio + meta.resposta * HORA,
    solucao: ms(chamado.prazo_solucao) ?? inicio + meta.solucao * HORA,
  };
}

function calcularSla(chamado, agora = Date.now()) {
  const { inicio, resposta, solucao } = prazosDoChamado(chamado);
  return {
    resposta: {
      prazo: new Date(resposta).toISOString(),
      situacao: situacao(inicio, resposta, ms(chamado.primeira_resposta_em), agora),
    },
    solucao: {
      prazo: new Date(solucao).toISOString(),
      situacao: situacao(inicio, solucao, ms(chamado.resolvido_em), agora),
    },
  };
}

// Prazos de um chamado novo (ou recalculados) a partir das horas de SLA
function calcularPrazos(inicio, horasResposta, horasSolucao) {
  const base = ms(inicio);
  return {
    prazo_resposta: new Date(base + Number(horasResposta) * HORA),
    prazo_solucao: new Date(base + Number(horasSolucao) * HORA),
  };
}

// Horas de SLA de uma subcategoria, com as metas da prioridade como reserva
function horasSla(categoria, prioridade) {
  const meta = METAS_SLA[prioridade] || METAS_SLA.media;
  return {
    resposta: categoria?.sla_resposta_horas ?? meta.resposta,
    solucao: categoria?.sla_solucao_horas ?? meta.solucao,
  };
}

// Prazo de solução no próprio SQL, para filtrar e ordenar a fila.
// fator: 1 = prazo final; 0.75 = início da faixa "em risco".
function prazoSolucaoSql(fator = 1) {
  if (fator === 1) return literal('`Chamado`.`prazo_solucao`');
  return literal(
    `DATE_ADD(\`Chamado\`.\`created_at\`, INTERVAL FLOOR(TIMESTAMPDIFF(SECOND, \`Chamado\`.\`created_at\`, \`Chamado\`.\`prazo_solucao\`) * ${fator}) SECOND)`
  );
}

// Percentual inteiro (ou null quando não há dados)
const percentual = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

module.exports = {
  calcularSla, calcularPrazos, horasSla, prazoSolucaoSql, percentual,
};
