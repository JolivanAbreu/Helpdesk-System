// src/components/admin/GestaoGrupos.jsx
// Grupos técnicos (filas de atendimento, ex.: N1 e N2) e seus membros.
// O catálogo diz qual grupo recebe cada tipo de chamado; a transferência
// move o chamado entre grupos.
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Inbox } from "lucide-react";
import api, { mensagemDeErro } from "../../services/api";
import { PERFIS } from "../../config/dominio";
import { useEquipe, useGrupos } from "../../hooks/useCatalogo";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Campo, { Input } from "../ui/Campo";
import { Avatar } from "../ui/Selos";
import { Esqueleto } from "../ui/Estados";

export default function GestaoGrupos() {
  const { grupos, carregando, recarregar } = useGrupos();
  const { equipe, recarregar: recarregarEquipe } = useEquipe();
  const [editando, setEditando] = useState(null); // grupo, ou {} para criar

  if (carregando) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando grupos">
        {[1, 2, 3].map((i) => <Esqueleto key={i} className="h-48 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-aco">
          Cada grupo é uma fila de atendimento. Os técnicos veem os chamados dos seus grupos na aba "Do meu grupo".
        </p>
        <Button icone={Plus} onClick={() => setEditando({})}>Novo grupo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => (
          <section key={g.id} className={`flex flex-col rounded-lg border border-borda bg-white p-5 shadow-painel ${g.ativo ? "" : "opacity-70"}`} aria-label={g.nome}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                  {g.nome}
                  {!g.ativo && <span className="rounded bg-nevoa px-1.5 py-0.5 text-[11px] font-medium text-aco">Desativado</span>}
                </h2>
                {g.descricao && <p className="mt-1 text-sm text-aco">{g.descricao}</p>}
              </div>
              <button
                type="button"
                onClick={() => setEditando(g)}
                className="rounded p-1.5 text-aco hover:bg-nevoa hover:text-marinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                aria-label={`Editar ${g.nome}`}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-sm">
              <Inbox className="h-4 w-4 text-aco" aria-hidden="true" />
              <span className="num font-medium">{g.pendentes}</span>
              <span className="text-aco">{g.pendentes === 1 ? "chamado pendente" : "chamados pendentes"}</span>
            </p>

            <div className="mt-4 border-t border-borda pt-4">
              <h3 className="text-xs font-medium text-aco">Membros</h3>
              {g.membros.length ? (
                <ul className="mt-2 space-y-2">
                  {g.membros.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 text-sm">
                      <Avatar nome={m.nome} tamanho="sm" />
                      <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                      <span className="text-xs text-aco">{m.ativo ? PERFIS[m.perfil]?.rotulo : "Conta desativada"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-aco">Nenhum membro. Os chamados ficam na fila até alguém assumir.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {editando && (
        <GrupoModal
          grupo={editando.id ? editando : null}
          equipe={equipe}
          onFechar={() => setEditando(null)}
          onSalvo={async () => {
            setEditando(null);
            await Promise.all([recarregar(), recarregarEquipe()]);
          }}
        />
      )}
    </div>
  );
}

function GrupoModal({ grupo, equipe, onFechar, onSalvo }) {
  const criando = !grupo;
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [descricao, setDescricao] = useState(grupo?.descricao ?? "");
  const [ativo, setAtivo] = useState(grupo?.ativo ?? true);
  const [membros, setMembros] = useState(() => new Set(grupo?.membros.map((m) => m.id) ?? []));
  const [salvando, setSalvando] = useState(false);

  // Técnicos ativos, mais os membros atuais que estejam com a conta desativada
  const candidatos = [
    ...equipe,
    ...(grupo?.membros.filter((m) => !equipe.some((e) => e.id === m.id)) ?? []),
  ];

  function alternar(id) {
    setMembros((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSalvando(true);
    const corpo = { nome, descricao, membros: [...membros], ...(criando ? {} : { ativo }) };
    try {
      if (criando) await api.post("/grupos", corpo);
      else await api.put(`/grupos/${grupo.id}`, corpo);
      toast.success(criando ? `Grupo "${nome.trim()}" criado.` : "Grupo atualizado.");
      onSalvo();
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível salvar o grupo."));
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={criando ? "Novo grupo" : "Editar grupo"} onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Campo rotulo="Nome" ajuda="Ex.: Service Desk (N1), Infraestrutura (N2)">
          {(p) => <Input {...p} value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={100} required />}
        </Campo>
        <Campo rotulo="Descrição">
          {(p) => <Input {...p} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} />}
        </Campo>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-marinho">Membros</legend>
          <div className="max-h-56 divide-y divide-borda overflow-y-auto rounded-md border border-borda">
            {candidatos.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-nevoa/60">
                <input type="checkbox" checked={membros.has(m.id)} onChange={() => alternar(m.id)} className="h-4 w-4 rounded border-borda accent-azul" />
                <Avatar nome={m.nome} tamanho="sm" />
                <span className="flex-1">{m.nome}</span>
                <span className="text-xs text-aco">{PERFIS[m.perfil]?.rotulo}</span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-aco">Só usuários de suporte e administradores podem participar de grupos.</p>
        </fieldset>

        {!criando && (
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 rounded border-borda accent-azul" />
            Grupo ativo (pode receber transferências)
          </label>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={salvando}>{criando ? "Criar grupo" : "Salvar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
