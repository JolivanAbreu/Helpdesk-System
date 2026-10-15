// src/services/sla.js
// Cálculo dos prazos de atendimento (SLA) de um chamado.
//
// Cada chamado tem dois prazos, contados da abertura e definidos pela
// prioridade (ver METAS_SLA): primeira resposta da equipe e solução.
// Situações possíveis de cada prazo:
//   no_prazo  - em aberto, com folga
//   em_risco  - em aberto, já consumiu 75% ou mais do prazo
//   estourado - em aberto, prazo vencido
//   cumprido  - concluído dentro do prazo
//   violado   - concluído depois do prazo
const { literal } = require('sequelize');
const { METAS_SLA, LIMITE_RISCO_SLA, PRIORIDADES } = require('../config/perfis');

const HORA = 60 * 60 * 1000;

function situacao(inicio, horas, concluidoEm, agora) {
  const prazo = inicio + horas * HORA;
  if (concluidoEm) return concluidoEm <= prazo ? 'cumprido' : 'violado';
  if (agora > prazo) return 'estourado';
  if (agora - inicio >= horas * HORA * LIMITE_RISCO_SLA) return 'em_risco';
  return 'no_prazo';
}

const ms = (data) => (data ? new Date(data).getTime() : null);

function calcularSla(chamado, agora = Date.now()) {
  const meta = METAS_SLA[chamado.prioridade] || METAS_SLA.media;
  const inicio = ms(chamado.createdAt);
  const prazo = (horas) => new Date(inicio + horas * HORA).toISOString();

  return {
    resposta: {
      prazo: prazo(meta.resposta),
      situacao: situacao(inicio, meta.resposta, ms(chamado.primeira_resposta_em), agora),
    },
    solucao: {
      prazo: prazo(meta.solucao),
      situacao: situacao(inicio, meta.solucao, ms(chamado.resolvido_em), agora),
    },
  };
}

// Prazo de solução calculado no próprio SQL, para filtrar e ordenar a fila.
// fatorHoras: 1 = prazo final; 0.75 = início da faixa "em risco".
function prazoSolucaoSql(fatorHoras = 1) {
  const casos = PRIORIDADES
    .map((p) => `WHEN '${p}' THEN ${Math.round(METAS_SLA[p].solucao * 60 * fatorHoras)}`)
    .join(' ');
  return literal(
    `DATE_ADD(\`Chamado\`.\`created_at\`, INTERVAL (CASE \`Chamado\`.\`prioridade\` ${casos} END) MINUTE)`
  );
}

// Percentual inteiro (ou null quando não há dados)
const percentual = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

module.exports = { calcularSla, prazoSolucaoSql, percentual };
