// src/components/ui/Logo.jsx
import React from "react";
import { MARCA } from "../../config/marca";

// Símbolo: dois nós ligados (quem pede e quem atende) dentro de um quadrado.
export function Simbolo({ className = "h-8 w-8", claro = false }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill={claro ? "#FFFFFF" : "#1F5FAD"} />
      <path d="M10 21 L22 11" stroke={claro ? "#1F5FAD" : "#FFFFFF"} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="21" r="3.6" fill={claro ? "#1F5FAD" : "#FFFFFF"} />
      <circle cx="22" cy="11" r="3.6" fill={claro ? "#0F2A44" : "#9CC0EA"} />
    </svg>
  );
}

export default function Logo({ claro = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Simbolo claro={claro} />
      <span className={`text-lg font-semibold tracking-tight ${claro ? "text-white" : "text-marinho"}`}>
        {MARCA.nome}
      </span>
    </span>
  );
}
