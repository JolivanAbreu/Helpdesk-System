// src/components/AvisoDemo.jsx
import React, { useState } from "react";
import { FlaskConical } from "lucide-react";
import { ConfirmarModal } from "./ui/Modal";

// Faixa exibida na demonstração sem servidor (VITE_DEMO_LOCAL=true)
export default function AvisoDemo() {
  const [confirmando, setConfirmando] = useState(false);

  async function restaurar() {
    const { restaurarDadosDeExemplo } = await import("../demo/banco");
    restaurarDadosDeExemplo();
    window.location.reload();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-azul-claro px-4 py-2 text-center text-sm text-marinho">
        <span className="inline-flex items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-azul" aria-hidden="true" />
          Demonstração: o que você fizer fica salvo só neste navegador.
        </span>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="font-medium text-azul underline-offset-2 hover:underline"
        >
          Restaurar dados de exemplo
        </button>
      </div>
      {confirmando && (
        <ConfirmarModal
          titulo="Restaurar os dados de exemplo?"
          mensagem="Os chamados, mensagens e usuários que você criou nesta demonstração serão apagados, e tudo volta ao estado inicial."
          rotuloConfirmar="Restaurar"
          onConfirmar={restaurar}
          onFechar={() => setConfirmando(false)}
        />
      )}
    </>
  );
}
