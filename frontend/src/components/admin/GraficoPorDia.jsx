// src/components/admin/GraficoPorDia.jsx
import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table2, ChartColumn } from "lucide-react";

// Cores validadas (daltonismo e contraste) — ver tailwind.config.js
const SERIES = [
  { chave: "abertos", rotulo: "Abertos", cor: "#1F5FAD" },
  { chave: "resolvidos", rotulo: "Resolvidos", cor: "#178E70" },
];

const diaCurto = (iso) => {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
};
const diaLongo = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function Dica({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-borda bg-white px-3 py-2 text-sm shadow-flutuante">
      <p className="mb-1 font-medium first-letter:uppercase">{diaLongo(label)}</p>
      {SERIES.map((s) => (
        <p key={s.chave} className="flex items-center gap-2 text-marinho">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} aria-hidden="true" />
          <span className="flex-1">{s.rotulo}</span>
          <span className="num font-medium">{payload.find((p) => p.dataKey === s.chave)?.value ?? 0}</span>
        </p>
      ))}
    </div>
  );
}

// Chamados abertos x resolvidos por dia, com alternância para tabela
export default function GraficoPorDia({ dados }) {
  const [comoTabela, setComoTabela] = useState(false);
  const totais = SERIES.map((s) => dados.reduce((soma, d) => soma + d[s.chave], 0));

  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Chamados nos últimos 14 dias</h2>
          <ul className="mt-2 flex flex-wrap gap-4 text-sm" aria-label="Legenda">
            {SERIES.map((s, i) => (
              <li key={s.chave} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} aria-hidden="true" />
                {s.rotulo}
                <span className="num font-medium">{totais[i]}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setComoTabela(!comoTabela)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-aco hover:bg-nevoa hover:text-marinho"
        >
          {comoTabela ? <ChartColumn className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          {comoTabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>

      {comoTabela ? (
        <div className="mt-4 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-aco">
              <tr><th className="py-1.5 font-medium">Dia</th>{SERIES.map((s) => <th key={s.chave} className="py-1.5 text-right font-medium">{s.rotulo}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {dados.map((d) => (
                <tr key={d.data}>
                  <td className="py-1.5">{diaCurto(d.data)}</td>
                  {SERIES.map((s) => <td key={s.chave} className="num py-1.5 text-right">{d[s.chave]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 h-64" role="img" aria-label={`Gráfico de barras: ${totais[0]} chamados abertos e ${totais[1]} resolvidos nos últimos 14 dias`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E4E9EF" />
              <XAxis dataKey="data" tickFormatter={diaCurto} tick={{ fill: "#5B6B7F", fontSize: 12 }} axisLine={{ stroke: "#D9E0E8" }} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={{ fill: "#5B6B7F", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<Dica />} cursor={{ fill: "#EEF2F6" }} />
              {SERIES.map((s) => (
                <Bar key={s.chave} dataKey={s.chave} name={s.rotulo} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
