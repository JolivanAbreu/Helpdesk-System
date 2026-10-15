// src/components/BuscaServicos.jsx
// Campo de busca da Central de Serviços: a pessoa descreve o problema e
// vê as subcategorias mais prováveis enquanto digita (ver utils/buscaCatalogo).
// Teclado: setas escolhem, Enter abre, Esc limpa.
import React, { useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, SearchX } from "lucide-react";
import { criarIndice, buscar } from "../utils/buscaCatalogo";
import { iconeCategoria } from "../config/dominio";
import { horasDePrazo } from "../utils/formatar";
import { PrioridadeSelo } from "./ui/Selos";

const EXEMPLOS = ["Esqueci minha senha", "Impressora não imprime", "Internet lenta", "Instalar programa"];

export default function BuscaServicos({ catalogo, onVerOutros }) {
  const navigate = useNavigate();
  const id = useId();
  const [consulta, setConsulta] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [focado, setFocado] = useState(false);

  const indice = useMemo(() => criarIndice(catalogo), [catalogo]);
  const resultados = useMemo(() => buscar(indice, consulta), [indice, consulta]);
  const digitou = consulta.trim().length >= 2;
  const aberto = focado && digitou;

  function escolher(resultado) {
    // O que a pessoa digitou vira o assunto inicial do chamado
    navigate(`/abrir/${resultado.sub.id}`, { state: { titulo: consulta.trim() } });
  }

  function aoTeclar(e) {
    if (e.key === "ArrowDown" && resultados.length) {
      e.preventDefault();
      setAtivo((a) => (a + 1) % resultados.length);
    } else if (e.key === "ArrowUp" && resultados.length) {
      e.preventDefault();
      setAtivo((a) => (a - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter" && resultados[ativo]) {
      e.preventDefault();
      escolher(resultados[ativo]);
    } else if (e.key === "Escape") {
      setConsulta("");
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-aco" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${id}-resultados`}
          aria-activedescendant={aberto && resultados[ativo] ? `${id}-${ativo}` : undefined}
          aria-autocomplete="list"
          aria-label="Descreva o que aconteceu"
          value={consulta}
          onChange={(e) => { setConsulta(e.target.value); setAtivo(0); }}
          onKeyDown={aoTeclar}
          onFocus={() => setFocado(true)}
          onBlur={() => setTimeout(() => setFocado(false), 150)}
          placeholder="Descreva o que aconteceu. Ex.: impressora atolando papel"
          autoComplete="off"
          className="h-14 w-full rounded-lg border-0 bg-white pl-12 pr-4 text-base text-marinho shadow-flutuante placeholder:text-aco/80 focus:outline-none focus:ring-4 focus:ring-azul/30"
        />
      </div>

      {!digitou && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/70">Exemplos:</span>
          {EXEMPLOS.map((exemplo) => (
            <button
              key={exemplo}
              type="button"
              onClick={() => { setConsulta(exemplo); setFocado(true); }}
              className="rounded-full bg-white/10 px-3 py-1 text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {exemplo}
            </button>
          ))}
        </div>
      )}

      {aberto && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-borda bg-white shadow-flutuante">
          {resultados.length ? (
            <>
              <p className="border-b border-borda px-4 py-2 text-xs text-aco">Serviços sugeridos para a sua descrição</p>
              <ul id={`${id}-resultados`} role="listbox" aria-label="Serviços sugeridos">
                {resultados.map((r, i) => {
                  const Icone = iconeCategoria(r.pai.icone);
                  return (
                    <li
                      key={r.sub.id}
                      id={`${id}-${i}`}
                      role="option"
                      aria-selected={i === ativo}
                      onMouseDown={(e) => { e.preventDefault(); escolher(r); }}
                      onMouseEnter={() => setAtivo(i)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${i === ativo ? "bg-azul-claro/60" : ""}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nevoa text-azul">
                        <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-marinho">{r.sub.nome}</span>
                        <span className="block truncate text-xs text-aco">
                          {r.pai.nome} · solução em até {horasDePrazo(r.sub.sla_solucao_horas)}
                        </span>
                      </span>
                      <span className="hidden sm:block"><PrioridadeSelo prioridade={r.sub.prioridade} /></span>
                      {i === ativo && <CornerDownLeft className="h-4 w-4 shrink-0 text-aco" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div id={`${id}-resultados`} className="flex items-start gap-3 px-4 py-4 text-sm">
              <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-aco" aria-hidden="true" />
              <p className="text-aco">
                Não encontramos um serviço para "{consulta.trim()}". Escolha uma categoria abaixo ou{" "}
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onVerOutros(consulta.trim()); }} className="font-medium text-azul hover:underline">
                  abra em Outros assuntos
                </button>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
