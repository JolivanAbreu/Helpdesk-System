// src/components/ui/Campo.jsx
import React, { useId } from "react";

export const estiloControle =
  "rounded-md border border-borda bg-white px-3 text-sm text-marinho placeholder:text-aco/70 transition-colors hover:border-aco/50 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20 disabled:bg-nevoa disabled:text-aco";

// Rótulo + controle + texto de ajuda, com os ids ligados para leitores de tela.
// Uso: <Campo rotulo="E-mail">{(props) => <input {...props} />}</Campo>
export default function Campo({ rotulo, ajuda, children, className = "" }) {
  const id = useId();
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-marinho mb-1.5">
        {rotulo}
      </label>
      {children({ id, "aria-describedby": idAjuda })}
      {ajuda && (
        <p id={idAjuda} className="mt-1.5 text-xs text-aco">
          {ajuda}
        </p>
      )}
    </div>
  );
}

// Ocupa a largura toda, a menos que a página informe outra largura (w-...)
const largura = (className) => (/(^|\s)w-/.test(className) ? "" : "w-full");

export function Input({ className = "", ...props }) {
  return <input className={`${estiloControle} ${largura(className)} h-10 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`${estiloControle} ${largura(className)} py-2 leading-relaxed ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${estiloControle} ${largura(className)} h-10 pr-8 ${className}`} {...props}>
      {children}
    </select>
  );
}
