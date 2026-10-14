// src/components/layout/AuthLayout.jsx
import React from "react";
import Logo from "../ui/Logo";
import { MARCA } from "../../config/marca";

// Prévia ilustrativa da fila no painel da marca
const PREVIA = [
  { codigo: "CH-0118", titulo: "Sistema ERP fora do ar", prioridade: "bg-prioridade-critica", estado: "Em andamento" },
  { codigo: "CH-0121", titulo: "Impressora do financeiro offline", prioridade: "bg-prioridade-alta", estado: "Aberto" },
  { codigo: "CH-0124", titulo: "Acesso à pasta compartilhada", prioridade: "bg-prioridade-media", estado: "Aberto" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="hidden lg:flex flex-col justify-between bg-marinho px-12 py-10 text-white">
        <Logo claro />
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Cada pedido de ajuda, do registro à solução.
          </h1>
          <p className="mt-4 text-white/70 leading-relaxed">
            Abra chamados, acompanhe o atendimento e veja quem está cuidando de cada problema.
          </p>
          <ul className="mt-10 space-y-2" aria-label="Exemplo de fila de chamados">
            {PREVIA.map((item) => (
              <li key={item.codigo} className="flex items-center gap-4 overflow-hidden rounded-md bg-white/[0.06] pr-4">
                <span className={`h-12 w-1 ${item.prioridade}`} aria-hidden="true" />
                <span className="num text-xs text-white/50">{item.codigo}</span>
                <span className="flex-1 truncate text-sm">{item.titulo}</span>
                <span className="text-xs text-white/60">{item.estado}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">{MARCA.descricao}</p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="lg:hidden mb-10" />
          {children}
        </div>
      </section>
    </div>
  );
}
