// src/components/NovoChamadoModal.jsx
// Abertura de chamado pelo catálogo de serviços: o solicitante escolhe a
// categoria e a subcategoria, e é a subcategoria que define a prioridade,
// os prazos e o grupo que vai atender. Ninguém precisa "escolher urgência".
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Clock, Users } from "lucide-react";
import api, { mensagemDeErro } from "../services/api";
import { codigoChamado, horasDePrazo } from "../utils/formatar";
import { iconeCategoria } from "../config/dominio";
import { useCatalogo } from "../hooks/useCatalogo";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Campo, { Input, Textarea } from "./ui/Campo";
import { PrioridadeSelo } from "./ui/Selos";

// Cartão de opção (radio escondido + rótulo clicável)
function Opcao({ nome, valor, marcado, onEscolher, children, className = "" }) {
  return (
    <label
      className={`flex cursor-pointer rounded-md border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
        marcado ? "border-azul bg-azul-claro/60 ring-1 ring-azul" : "border-borda hover:border-aco/50"
      } ${className}`}
    >
      <input type="radio" name={nome} value={valor} checked={marcado} onChange={onEscolher} className="sr-only" required />
      {children}
    </label>
  );
}

export default function NovoChamadoModal({ onFechar, onCriado }) {
  const { catalogo, carregando, erro } = useCatalogo();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState(null);
  const [subcategoriaId, setSubcategoriaId] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const categoria = catalogo.find((c) => c.id === categoriaId);
  const subcategoria = categoria?.subcategorias.find((s) => s.id === subcategoriaId);

  function escolherCategoria(c) {
    setCategoriaId(c.id);
    // Categoria com uma única opção já vem escolhida
    setSubcategoriaId(c.subcategorias.length === 1 ? c.subcategorias[0].id : null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!subcategoria) {
      toast.error("Escolha o tipo de problema.");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await api.post("/chamados", { titulo, descricao, categoria_id: subcategoria.id });
      toast.success(`Chamado ${codigoChamado(data.id)} aberto.`);
      onCriado(data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível abrir o chamado."));
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Novo chamado"
      descricao="Escolha o assunto do catálogo: ele define a prioridade e a equipe que vai atender."
      onFechar={onFechar}
      largura="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Campo rotulo="Assunto">
          {(p) => (
            <Input
              {...p}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Impressora do financeiro não imprime"
              minLength={3}
              maxLength={255}
              required
            />
          )}
        </Campo>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-marinho">Categoria</legend>
          {carregando ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[66px] animate-pulse rounded-md bg-nevoa" />)}
            </div>
          ) : erro ? (
            <p className="text-sm text-prioridade-critica">Não foi possível carregar o catálogo. Feche e tente novamente.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {catalogo.map((c) => {
                const Icone = iconeCategoria(c.icone);
                return (
                  <Opcao key={c.id} nome="categoria" valor={c.id} marcado={categoriaId === c.id} onEscolher={() => escolherCategoria(c)} className="items-center gap-2.5 px-3 py-2.5">
                    <Icone className={`h-5 w-5 shrink-0 ${categoriaId === c.id ? "text-azul" : "text-aco"}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{c.nome}</span>
                      {c.descricao && <span className="mt-0.5 line-clamp-1 text-xs text-aco">{c.descricao}</span>}
                    </span>
                  </Opcao>
                );
              })}
            </div>
          )}
        </fieldset>

        {categoria && (
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-marinho">Qual o problema?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoria.subcategorias.map((s) => (
                <Opcao key={s.id} nome="subcategoria" valor={s.id} marcado={subcategoriaId === s.id} onEscolher={() => setSubcategoriaId(s.id)} className="flex-col px-3 py-2">
                  <span className="text-sm font-medium">{s.nome}</span>
                  {s.descricao && <span className="mt-0.5 text-xs text-aco">{s.descricao}</span>}
                </Opcao>
              ))}
            </div>
          </fieldset>
        )}

        {subcategoria && (
          <div className="rounded-md border border-borda bg-nevoa/60 px-4 py-3 text-sm" aria-live="polite">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-2">
                <span className="text-aco">Prioridade</span>
                <PrioridadeSelo prioridade={subcategoria.prioridade} />
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-aco" aria-hidden="true" />
                Resposta em até <strong className="font-semibold">{horasDePrazo(subcategoria.sla_resposta_horas)}</strong>
                · solução em até <strong className="font-semibold">{horasDePrazo(subcategoria.sla_solucao_horas)}</strong>
              </span>
              {subcategoria.grupo && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-aco" aria-hidden="true" />
                  {subcategoria.grupo.nome}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-aco">Definido pelo catálogo de serviços. Se for preciso, a equipe ajusta depois.</p>
          </div>
        )}

        <Campo rotulo="Descrição" ajuda="Inclua quando começou, o que aparece na tela e o que você já tentou.">
          {(p) => (
            <Textarea
              {...p}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              required
            />
          )}
        </Campo>

        <div className="flex justify-end gap-3 pt-1">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando} disabled={!subcategoria}>Abrir chamado</Button>
        </div>
      </form>
    </Modal>
  );
}
