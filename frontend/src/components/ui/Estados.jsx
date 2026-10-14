// src/components/ui/Estados.jsx
// Carregamento (esqueleto) e estado vazio.
import React from "react";

export function Esqueleto({ className = "" }) {
  return <div className={`animate-pulse rounded bg-borda/60 ${className}`} aria-hidden="true" />;
}

// Linhas de tabela fantasmas enquanto a lista carrega
export function EsqueletoLinhas({ linhas = 6 }) {
  return (
    <div className="divide-y divide-borda" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Esqueleto className="h-4 w-16" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-4 w-2/5" />
            <Esqueleto className="h-3 w-1/4" />
          </div>
          <Esqueleto className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function Vazio({ icone: Icone, titulo, texto, acao }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      {Icone && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-nevoa text-aco">
          <Icone className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-medium text-marinho">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-aco">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
