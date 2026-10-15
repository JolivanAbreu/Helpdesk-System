// src/components/admin/GestaoCatalogo.jsx
// Catálogo de serviços: categorias principais e subcategorias. Cada
// subcategoria define a prioridade, os prazos e o grupo que recebe os
// chamados. Mudanças valem só para chamados abertos depois delas.
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Users, Info, Trash2, ListChecks } from "lucide-react";
import api, { mensagemDeErro } from "../../services/api";
import { PRIORIDADES, LISTA_PRIORIDADES, METAS_SLA, ICONES_CATEGORIA, LISTA_ICONES, iconeCategoria } from "../../config/dominio";
import { horasDePrazo } from "../../utils/formatar";
import { useCatalogo, useGrupos } from "../../hooks/useCatalogo";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Campo, { Input, Select, Textarea } from "../ui/Campo";
import { PrioridadeSelo } from "../ui/Selos";
import { Esqueleto } from "../ui/Estados";

export default function GestaoCatalogo() {
  const { catalogo, carregando, recarregar } = useCatalogo({ inativas: true });
  const { grupos } = useGrupos();
  const [editando, setEditando] = useState(null); // { item?, pai? }

  if (carregando) {
    return (
      <div className="space-y-4" role="status" aria-label="Carregando catálogo">
        {[1, 2, 3].map((i) => <Esqueleto key={i} className="h-44 rounded-lg" />)}
      </div>
    );
  }

  const totalSubs = catalogo.reduce((soma, c) => soma + c.subcategorias.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="flex max-w-2xl items-start gap-2 text-sm text-aco">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {catalogo.length} categorias e {totalSubs} subcategorias. A subcategoria escolhida na abertura define a prioridade,
            os prazos e o grupo que atende. Alterações valem para os próximos chamados; os já abertos mantêm os prazos.
          </span>
        </p>
        <Button icone={Plus} onClick={() => setEditando({})}>Nova categoria</Button>
      </div>

      {catalogo.map((pai) => {
        const Icone = iconeCategoria(pai.icone);
        return (
          <section key={pai.id} className={`rounded-lg border border-borda bg-white shadow-painel ${pai.ativo ? "" : "opacity-70"}`} aria-label={pai.nome}>
            <header className="flex flex-wrap items-center gap-3 border-b border-borda px-5 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-azul-claro text-azul">
                <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 font-semibold">
                  {pai.nome}
                  {!pai.ativo && <Desativado />}
                </h2>
                {pai.descricao && <p className="truncate text-sm text-aco">{pai.descricao}</p>}
              </div>
              <div className="flex gap-2">
                <Button variante="secundario" tamanho="sm" icone={Pencil} onClick={() => setEditando({ item: pai })} aria-label={`Editar ${pai.nome}`}>
                  Editar
                </Button>
                <Button variante="secundario" tamanho="sm" icone={Plus} onClick={() => setEditando({ pai })}>
                  Subcategoria
                </Button>
              </div>
            </header>

            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[680px] table-fixed text-sm">
                <colgroup>
                  <col />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-52" />
                  <col className="w-16" />
                </colgroup>
                <thead className="bg-nevoa/60 text-left text-xs text-aco">
                  <tr>
                    <th className="px-5 py-2 font-medium">Subcategoria</th>
                    <th className="px-3 py-2 font-medium">Prioridade</th>
                    <th className="px-3 py-2 text-right font-medium">Resposta</th>
                    <th className="px-3 py-2 text-right font-medium">Solução</th>
                    <th className="px-3 py-2 font-medium">Grupo</th>
                    <th className="px-5 py-2"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {pai.subcategorias.map((sub) => (
                    <tr key={sub.id} className={sub.ativo ? "" : "text-aco"}>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2 font-medium">
                          {sub.nome}
                          {!sub.ativo && <Desativado />}
                        </span>
                        {sub.descricao && <span className="block max-w-xs truncate text-xs text-aco">{sub.descricao}</span>}
                      </td>
                      <td className="px-3 py-2.5"><PrioridadeSelo prioridade={sub.prioridade} /></td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">{horasDePrazo(sub.sla_resposta_horas)}</td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">{horasDePrazo(sub.sla_solucao_horas)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-aco">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {sub.grupo?.nome ?? "Sem grupo"}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditando({ item: sub, pai })}
                          className="rounded p-1.5 text-aco hover:bg-nevoa hover:text-marinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                          aria-label={`Editar ${pai.nome} › ${sub.nome}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pai.subcategorias.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-4 text-aco">Nenhuma subcategoria. Sem elas, a categoria não aparece para quem abre chamados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {editando && (
        <CategoriaModal
          {...editando}
          grupos={grupos}
          onFechar={() => setEditando(null)}
          onSalvo={async () => { setEditando(null); await recarregar(); }}
        />
      )}
    </div>
  );
}

function Desativado() {
  return <span className="rounded bg-nevoa px-1.5 py-0.5 text-[11px] font-medium text-aco">Desativada</span>;
}

// Cria ou edita uma categoria principal (sem `pai`) ou uma subcategoria (com `pai`)
function CategoriaModal({ item, pai, grupos, onFechar, onSalvo }) {
  const ehSub = Boolean(pai);
  const criando = !item;
  const [nome, setNome] = useState(item?.nome ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [icone, setIcone] = useState(item?.icone ?? "outros");
  const [prioridade, setPrioridade] = useState(item?.prioridade ?? "media");
  const [resposta, setResposta] = useState(String(item?.sla_resposta_horas ?? METAS_SLA.media.resposta));
  const [solucao, setSolucao] = useState(String(item?.sla_solucao_horas ?? METAS_SLA.media.solucao));
  const [grupoId, setGrupoId] = useState(String(item ? item.grupo_id ?? "" : pai?.grupo_id ?? ""));
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  // Formulário de abertura (busca inteligente, sugestões e perguntas)
  const [aba, setAba] = useState("atendimento");
  const [palavras, setPalavras] = useState((item?.palavras_chave ?? []).join(", "));
  const [sugestoes, setSugestoes] = useState((item?.sugestoes ?? []).join("\n"));
  const [modelo, setModelo] = useState(item?.modelo_descricao ?? "");
  const [campos, setCampos] = useState(() => (item?.campos ?? []).map((c) => ({
    rotulo: c.rotulo, tipo: c.tipo, obrigatorio: c.obrigatorio, ajuda: c.ajuda ?? "", opcoes: (c.opcoes ?? []).join(", "),
  })));
  const [salvando, setSalvando] = useState(false);

  // Ao criar, os prazos acompanham as metas da prioridade escolhida
  function escolherPrioridade(valor) {
    setPrioridade(valor);
    if (criando) {
      setResposta(String(METAS_SLA[valor].resposta));
      setSolucao(String(METAS_SLA[valor].solucao));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const lista = (texto, separador) => texto.split(separador).map((v) => v.trim()).filter(Boolean);
    const corpo = {
      nome, descricao, ativo,
      grupo_id: grupoId ? Number(grupoId) : null,
      palavras_chave: lista(palavras, ","),
      ...(ehSub
        ? {
          prioridade,
          sla_resposta_horas: Number(resposta),
          sla_solucao_horas: Number(solucao),
          sugestoes: lista(sugestoes, "\n"),
          modelo_descricao: modelo,
          campos: campos.map((c) => ({
            rotulo: c.rotulo, tipo: c.tipo, obrigatorio: c.obrigatorio, ajuda: c.ajuda,
            opcoes: c.tipo === "selecao" ? lista(c.opcoes, ",") : [],
          })),
        }
        : { icone }),
      ...(criando && ehSub ? { parent_id: pai.id } : {}),
    };
    setSalvando(true);
    try {
      if (criando) await api.post("/categorias", corpo);
      else await api.put(`/categorias/${item.id}`, corpo);
      toast.success(criando ? `"${nome.trim()}" adicionada ao catálogo.` : "Catálogo atualizado.");
      onSalvo();
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível salvar."));
      setSalvando(false);
    }
  }

  let titulo = criando ? "Nova categoria" : "Editar categoria";
  if (ehSub) titulo = criando ? `Nova subcategoria em ${pai.nome}` : "Editar subcategoria";

  return (
    <Modal titulo={titulo} descricao={ehSub && !criando ? `${pai.nome} › ${item.nome}` : undefined} onFechar={onFechar} largura={ehSub ? "max-w-2xl" : "max-w-lg"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {ehSub && (
          <div className="flex gap-1 rounded-md bg-nevoa p-1" role="tablist" aria-label="Seções da subcategoria">
            {[["atendimento", "Atendimento"], ["formulario", `Formulário de abertura (${campos.length})`]].map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${aba === id ? "bg-white text-marinho shadow-painel" : "text-aco hover:text-marinho"}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}

        {ehSub && aba === "formulario" ? (
          <FormularioDeAbertura
            campos={campos} setCampos={setCampos}
            palavras={palavras} setPalavras={setPalavras}
            sugestoes={sugestoes} setSugestoes={setSugestoes}
            modelo={modelo} setModelo={setModelo}
          />
        ) : (
        <>
        <Campo rotulo="Nome">
          {(p) => <Input {...p} value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={100} required />}
        </Campo>
        <Campo rotulo="Descrição" ajuda={ehSub ? "Aparece para quem abre o chamado, para ajudar na escolha." : undefined}>
          {(p) => <Input {...p} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} />}
        </Campo>

        {ehSub ? (
          <>
            <Campo rotulo="Prioridade">
              {(p) => (
                <Select {...p} value={prioridade} onChange={(e) => escolherPrioridade(e.target.value)}>
                  {LISTA_PRIORIDADES.map((v) => <option key={v} value={v}>{PRIORIDADES[v].rotulo}</option>)}
                </Select>
              )}
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo rotulo="Primeira resposta (horas)">
                {(p) => <Input {...p} type="number" inputMode="decimal" min="0.25" max="2000" step="0.25" value={resposta} onChange={(e) => setResposta(e.target.value)} required />}
              </Campo>
              <Campo rotulo="Solução (horas)">
                {(p) => <Input {...p} type="number" inputMode="decimal" min="0.25" max="2000" step="0.25" value={solucao} onChange={(e) => setSolucao(e.target.value)} required />}
              </Campo>
            </div>
          </>
        ) : (
          <Campo rotulo="Ícone">
            {(p) => (
              <Select {...p} value={icone} onChange={(e) => setIcone(e.target.value)}>
                {LISTA_ICONES.map((v) => <option key={v} value={v}>{ICONES_CATEGORIA[v].rotulo}</option>)}
              </Select>
            )}
          </Campo>
        )}

        <Campo rotulo={ehSub ? "Grupo que atende" : "Grupo padrão"} ajuda={ehSub ? undefined : "Sugerido para as novas subcategorias desta categoria."}>
          {(p) => (
            <Select {...p} value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              <option value="">Nenhum</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}{g.ativo ? "" : " (desativado)"}</option>)}
            </Select>
          )}
        </Campo>

        {!ehSub && (
          <Campo rotulo="Palavras-chave" ajuda="Separadas por vírgula. Ajudam a busca a encontrar esta categoria.">
            {(p) => <Input {...p} value={palavras} onChange={(e) => setPalavras(e.target.value)} />}
          </Campo>
        )}

        {!criando && (
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 rounded border-borda accent-azul" />
            Disponível para novos chamados
          </label>
        )}
        </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={salvando}>{criando ? "Adicionar" : "Salvar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

const TIPOS = { texto: "Texto", numero: "Número", selecao: "Lista de opções" };
const MAX_CAMPOS = 8;

// Perguntas, palavras-chave, sugestões de título e modelo de descrição
function FormularioDeAbertura({ campos, setCampos, palavras, setPalavras, sugestoes, setSugestoes, modelo, setModelo }) {
  const mudar = (i, dados) => setCampos((lista) => lista.map((c, j) => (j === i ? { ...c, ...dados } : c)));
  const remover = (i) => setCampos((lista) => lista.filter((_, j) => j !== i));
  const adicionar = () => setCampos((lista) => [...lista, { rotulo: "", tipo: "texto", obrigatorio: false, ajuda: "", opcoes: "" }]);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-marinho">
          <ListChecks className="h-4 w-4 text-aco" aria-hidden="true" />
          Perguntas específicas
        </legend>
        <p className="mb-3 text-xs text-aco">Aparecem no formulário depois dos dados do solicitante. Mudanças não afetam chamados já abertos.</p>
        <ol className="space-y-3">
          {campos.map((campo, i) => (
            <li key={i} className="rounded-md border border-borda bg-nevoa/40 p-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <Input value={campo.rotulo} onChange={(e) => mudar(i, { rotulo: e.target.value })} placeholder="Pergunta. Ex.: Qual impressora" aria-label={`Pergunta ${i + 1}`} maxLength={80} required />
                <Select value={campo.tipo} onChange={(e) => mudar(i, { tipo: e.target.value })} aria-label={`Tipo da pergunta ${i + 1}`}>
                  {Object.entries(TIPOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </Select>
                <button
                  type="button"
                  onClick={() => remover(i)}
                  className="justify-self-end rounded p-2 text-aco hover:bg-white hover:text-prioridade-critica"
                  aria-label={`Remover pergunta ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {campo.tipo === "selecao" && (
                <Input className="mt-2" value={campo.opcoes} onChange={(e) => mudar(i, { opcoes: e.target.value })} placeholder="Opções separadas por vírgula. Ex.: Não imprime, Sem toner, Outro" aria-label={`Opções da pergunta ${i + 1}`} required />
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Input className="min-w-[200px] flex-1" value={campo.ajuda} onChange={(e) => mudar(i, { ajuda: e.target.value })} placeholder="Texto de ajuda (opcional)" aria-label={`Ajuda da pergunta ${i + 1}`} maxLength={120} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={campo.obrigatorio} onChange={(e) => mudar(i, { obrigatorio: e.target.checked })} className="h-4 w-4 rounded border-borda accent-azul" />
                  Obrigatória
                </label>
              </div>
            </li>
          ))}
        </ol>
        <Button variante="secundario" tamanho="sm" icone={Plus} onClick={adicionar} disabled={campos.length >= MAX_CAMPOS} className="mt-3">
          Adicionar pergunta
        </Button>
      </fieldset>

      <Campo rotulo="Palavras-chave da busca" ajuda="Separadas por vírgula. Inclua sinônimos e termos que as pessoas usam. Ex.: toner, papel, atolado">
        {(p) => <Input {...p} value={palavras} onChange={(e) => setPalavras(e.target.value)} />}
      </Campo>
      <Campo rotulo="Sugestões de assunto" ajuda="Uma por linha. Aparecem como atalhos ao preencher o assunto.">
        {(p) => <Textarea {...p} value={sugestoes} onChange={(e) => setSugestoes(e.target.value)} rows={3} />}
      </Campo>
      <Campo rotulo="Modelo de descrição" ajuda="Opcional. Em branco, vale o modelo padrão (o que aconteceu, desde quando, o que já tentou).">
        {(p) => <Textarea {...p} value={modelo} onChange={(e) => setModelo(e.target.value)} rows={3} maxLength={1000} />}
      </Campo>
    </div>
  );
}
