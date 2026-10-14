// src/components/ui/Button.jsx
import React from "react";
import { LoaderCircle } from "lucide-react";

const VARIANTES = {
  primario: "bg-azul text-white hover:bg-azul-escuro shadow-painel",
  secundario: "bg-white text-marinho border border-borda hover:bg-nevoa",
  fantasma: "text-aco hover:text-marinho hover:bg-nevoa",
  perigo: "bg-white text-prioridade-critica border border-red-200 hover:bg-red-50",
  perigoSolido: "bg-prioridade-critica text-white hover:bg-red-800",
};

const TAMANHOS = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icone: "h-9 w-9 justify-center",
};

export default function Button({
  variante = "primario",
  tamanho = "md",
  icone: Icone,
  carregando = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={`inline-flex items-center rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...props}
    >
      {carregando ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icone && <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
