// src/components/layout/Cabecalho.jsx
import React from "react";

// Título da página com descrição opcional e ações à direita
export default function Cabecalho({ titulo, descricao, acoes, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {children}
        <h1 className="text-2xl font-semibold tracking-tight text-marinho">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-aco">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
