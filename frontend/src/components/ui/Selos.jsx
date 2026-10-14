// src/components/ui/Selos.jsx
// Selos de status e prioridade, avatar e outros pequenos indicadores.
import React from "react";
import { STATUS, PRIORIDADES } from "../../config/dominio";
import { iniciais } from "../../utils/formatar";

export function StatusSelo({ status }) {
  const info = STATUS[status] || { rotulo: status, classe: "bg-nevoa text-aco" };
  const Icone = info.icone;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${info.classe}`}>
      {Icone && <Icone className="h-3.5 w-3.5" aria-hidden="true" />}
      {info.rotulo}
    </span>
  );
}

// Barras de sinal: crítica 4, alta 3, média 2, baixa 1 — a intensidade
// fica legível mesmo sem distinguir as cores.
const NIVEL = { critica: 4, alta: 3, media: 2, baixa: 1 };

export function PrioridadeSelo({ prioridade }) {
  const info = PRIORIDADES[prioridade] || PRIORIDADES.media;
  const nivel = NIVEL[prioridade] || 2;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-marinho whitespace-nowrap">
      <span className="flex items-end gap-[2px] h-3" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`w-[3px] rounded-sm ${n <= nivel ? info.cor : "bg-borda"}`}
            style={{ height: `${n * 3}px` }}
          />
        ))}
      </span>
      {info.rotulo}
    </span>
  );
}

// Cor do avatar derivada do nome (sempre a mesma para a mesma pessoa)
const TONS = ["bg-[#1F5FAD]", "bg-[#16365A]", "bg-[#2F6F8F]", "bg-[#4B5D8C]", "bg-[#3B6E5F]", "bg-[#6B5B8C]"];

export function Avatar({ nome, tamanho = "md" }) {
  const soma = [...(nome || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const dimensoes = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" }[tamanho];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${TONS[soma % TONS.length]} ${dimensoes}`}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  );
}

export function Contador({ valor, ativo }) {
  return (
    <span className={`num rounded-full px-1.5 text-xs font-medium ${ativo ? "bg-azul text-white" : "bg-nevoa text-aco"}`}>
      {valor}
    </span>
  );
}
