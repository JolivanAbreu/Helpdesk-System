// src/hooks/useAtualizacaoPeriodica.js
import { useEffect, useRef } from "react";

// Executa `funcao` a cada `intervaloMs` enquanto a aba do navegador estiver
// visível, e logo ao voltar para ela. Mantém listas e conversas atualizadas
// sem o usuário precisar recarregar a página.
export default function useAtualizacaoPeriodica(funcao, intervaloMs) {
  const ref = useRef(funcao);
  ref.current = funcao;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, intervaloMs);
    const aoVoltar = () => document.visibilityState === "visible" && ref.current();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [intervaloMs]);
}
