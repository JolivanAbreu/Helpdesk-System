// src/components/SubcategoriasModal.jsx
// Subcategorias de uma categoria, em cards. Escolher uma abre o formulário.
import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { horasDePrazo } from "../utils/formatar";
import { iconeCategoria } from "../config/dominio";
import Modal from "./ui/Modal";
import { PrioridadeSelo } from "./ui/Selos";

export default function SubcategoriasModal({ categoria, onFechar }) {
  const navigate = useNavigate();
  const Icone = iconeCategoria(categoria.icone);

  return (
    <Modal
      titulo={categoria.nome}
      descricao="Qual destas opções descreve melhor o que você precisa?"
      onFechar={onFechar}
      largura="max-w-3xl"
    >
      <ul className="grid gap-3 sm:grid-cols-2" aria-label={`Opções de ${categoria.nome}`}>
        {categoria.subcategorias.map((sub) => {
          const exemplo = sub.descricao || (sub.sugestoes?.length ? `Ex.: ${sub.sugestoes.slice(0, 2).join("; ")}` : null);
          return (
            <li key={sub.id}>
              <button
                type="button"
                onClick={() => navigate(`/abrir/${sub.id}`)}
                className="group flex h-full w-full flex-col rounded-lg border border-borda bg-white p-4 text-left transition hover:-translate-y-px hover:border-azul hover:shadow-painel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul"
              >
                <span className="flex w-full items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-nevoa text-aco transition-colors group-hover:bg-azul-claro group-hover:text-azul">
                    <Icone className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-marinho">{sub.nome}</span>
                    {exemplo && <span className="mt-0.5 block text-xs leading-relaxed text-aco">{exemplo}</span>}
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-aco transition-transform group-hover:translate-x-0.5 group-hover:text-azul" aria-hidden="true" />
                </span>
                <span className="mt-3 flex w-full items-center gap-4 border-t border-borda pt-3 text-xs text-aco">
                  <PrioridadeSelo prioridade={sub.prioridade} />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    Solução em até {horasDePrazo(sub.sla_solucao_horas)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
