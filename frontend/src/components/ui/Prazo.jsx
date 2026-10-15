// src/components/ui/Prazo.jsx
// Indicadores de SLA: texto do prazo na fila e barra de consumo no detalhe.
import React from "react";
import { AlertTriangle, Clock, CircleCheck, CircleX } from "lucide-react";
import { SITUACOES_SLA } from "../../config/dominio";
import { textoPrazo, dataHora, duracaoCurta } from "../../utils/formatar";

const TONS = {
  neutro: { texto: "text-aco", barra: "bg-azul", icone: Clock },
  alerta: { texto: "text-amber-800", barra: "bg-amber-500", icone: Clock },
  perigo: { texto: "text-prioridade-critica", barra: "bg-prioridade-critica", icone: AlertTriangle },
  sucesso: { texto: "text-emerald-800", barra: "bg-emerald-600", icone: CircleCheck },
  falha: { texto: "text-prioridade-alta", barra: "bg-prioridade-alta", icone: CircleX },
};

const tomDe = (situacao) => TONS[SITUACOES_SLA[situacao]?.tom] || TONS.neutro;

// "Atrasado há 2 d" (vermelho), "Vence em 50 min" (âmbar), "Vence em 3 h" (neutro)...
export function PrazoTexto({ sla, className = "" }) {
  const tom = tomDe(sla.situacao);
  const Icone = tom.icone;
  const destaque = ["estourado", "em_risco"].includes(sla.situacao);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${tom.texto} ${destaque ? "font-medium" : ""} ${className}`}
      title={`Prazo: ${dataHora(sla.prazo)}`}
    >
      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {textoPrazo(sla)}
    </span>
  );
}

// Bloco do detalhe: rótulo, situação, barra do prazo consumido e data limite
export function PrazoBarra({ rotulo, sla, inicio, concluidoEm }) {
  const tom = tomDe(sla.situacao);
  const Icone = tom.icone;
  const total = new Date(sla.prazo) - new Date(inicio);
  const fim = concluidoEm ? new Date(concluidoEm) : new Date();
  const usado = fim - new Date(inicio);
  const pct = Math.min(100, Math.max(2, (usado / total) * 100));
  const restante = new Date(sla.prazo) - Date.now();

  let detalhe;
  if (concluidoEm) detalhe = `em ${duracaoCurta(usado)} (meta: ${duracaoCurta(total)})`;
  else if (sla.situacao === "estourado") detalhe = `venceu há ${duracaoCurta(restante)}`;
  else detalhe = `vence em ${duracaoCurta(restante)}`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-aco">{rotulo}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${tom.texto}`}>
          <Icone className="h-3.5 w-3.5" aria-hidden="true" />
          {SITUACOES_SLA[sla.situacao]?.rotulo}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 rounded-full bg-nevoa"
        role="progressbar"
        aria-label={`${rotulo}: ${Math.round((usado / total) * 100)}% do prazo usado`}
        aria-valuenow={Math.round(Math.min(100, (usado / total) * 100))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-1.5 rounded-full ${tom.barra}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-aco" title={dataHora(sla.prazo)}>
        {detalhe}
      </p>
    </div>
  );
}
