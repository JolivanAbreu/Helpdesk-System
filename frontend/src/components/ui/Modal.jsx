// src/components/ui/Modal.jsx
import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button";

// Janela modal acessível: fecha com Esc ou clicando fora, devolve o foco
// para onde estava ao fechar e mantém o Tab dentro da janela.
export default function Modal({ titulo, descricao, onFechar, children, largura = "max-w-lg" }) {
  const idTitulo = useId();
  const caixa = useRef(null);
  // Guarda a função mais recente sem reexecutar o efeito (que roubaria o foco)
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const focoAnterior = document.activeElement;
    const focaveis = () =>
      caixa.current?.querySelectorAll('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])') ?? [];

    // Foca o primeiro campo (ou o primeiro botão)
    const primeiro = [...focaveis()].find((el) => el.matches("input, select, textarea")) || focaveis()[0];
    primeiro?.focus();

    function aoTeclar(e) {
      if (e.key === "Escape") fechar.current();
      if (e.key === "Tab") {
        const lista = [...focaveis()].filter((el) => !el.disabled);
        if (!lista.length) return;
        const [inicio, fim] = [lista[0], lista[lista.length - 1]];
        if (e.shiftKey && document.activeElement === inicio) { e.preventDefault(); fim.focus(); }
        else if (!e.shiftKey && document.activeElement === fim) { e.preventDefault(); inicio.focus(); }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
      focoAnterior?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-marinho/40 p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`w-full ${largura} bg-white rounded-t-xl sm:rounded-lg shadow-flutuante animate-surgir max-h-[92vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id={idTitulo} className="text-lg font-semibold text-marinho">{titulo}</h2>
            {descricao && <p className="mt-1 text-sm text-aco">{descricao}</p>}
          </div>
          <Button variante="fantasma" tamanho="icone" icone={X} onClick={onFechar} aria-label="Fechar" className="-mr-2 -mt-1" />
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

// Confirmação para ações sensíveis (substitui o window.confirm)
export function ConfirmarModal({ titulo, mensagem, rotuloConfirmar, perigo = false, carregando, onConfirmar, onFechar }) {
  return (
    <Modal titulo={titulo} onFechar={onFechar} largura="max-w-md">
      <p className="text-sm text-aco leading-relaxed">{mensagem}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
        <Button variante={perigo ? "perigoSolido" : "primario"} carregando={carregando} onClick={onConfirmar}>
          {rotuloConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
