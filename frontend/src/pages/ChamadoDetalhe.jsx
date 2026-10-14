// src/pages/ChamadoDetalhe.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, Send, Paperclip, FileText, Image as ImageIcon, Download, UploadCloud,
  UserCheck, SignalHigh, RefreshCw, CheckCircle2, RotateCcw,
} from "lucide-react";
import api, { isEquipe, mensagemDeErro } from "../services/api";
import { STATUS, LISTA_STATUS, PRIORIDADES, LISTA_PRIORIDADES } from "../config/dominio";
import { codigoChamado, tempoRelativo, dataHora } from "../utils/formatar";
import useAtualizacaoPeriodica from "../hooks/useAtualizacaoPeriodica";
import Button from "../components/ui/Button";
import { Select, Textarea } from "../components/ui/Campo";
import { StatusSelo, PrioridadeSelo, Avatar } from "../components/ui/Selos";
import { Esqueleto } from "../components/ui/Estados";

const TIPOS_ACEITOS = "image/jpeg,image/png,image/gif,application/pdf";

export default function ChamadoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, atualizarContadores } = useOutletContext();
  const equipe = isEquipe(user);

  const [chamado, setChamado] = useState(null);
  const [membrosEquipe, setMembrosEquipe] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(null); // qual propriedade está sendo salva
  const fimDaConversa = useRef(null);

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    try {
      const { data } = await api.get(`/chamados/${id}`);
      setChamado(data);
    } catch (error) {
      if (!silencioso) {
        toast.error(mensagemDeErro(error, "Não foi possível abrir o chamado."));
        navigate("/chamados");
      }
    }
  }, [id, navigate]);

  useEffect(() => { setChamado(null); carregar(); }, [carregar]);
  useAtualizacaoPeriodica(() => carregar({ silencioso: true }), 15000);

  useEffect(() => {
    if (equipe) api.get("/equipe").then(({ data }) => setMembrosEquipe(data)).catch(() => {});
  }, [equipe]);

  // Altera status, prioridade ou responsável e recarrega (para trazer o evento novo)
  async function alterar(propriedade, rota, corpo, sucesso) {
    setSalvando(propriedade);
    try {
      await api.put(`/chamados/${id}/${rota}`, corpo);
      await carregar({ silencioso: true });
      atualizarContadores();
      toast.success(sucesso);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível salvar a alteração."));
    } finally {
      setSalvando(null);
    }
  }

  async function enviarMensagem(e) {
    e?.preventDefault();
    if (!mensagem.trim() || enviando) return;
    setEnviando(true);
    try {
      await api.post(`/chamados/${id}/interacoes`, { mensagem });
      setMensagem("");
      await carregar({ silencioso: true });
      requestAnimationFrame(() => fimDaConversa.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível enviar a mensagem."));
    } finally {
      setEnviando(false);
    }
  }

  if (!chamado) return <CarregandoDetalhe />;

  const souDono = chamado.usuario?.id === user?.id;

  return (
    <>
      <Link to="/chamados" className="inline-flex items-center gap-1.5 text-sm text-aco hover:text-marinho">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {equipe ? "Fila de chamados" : "Meus chamados"}
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="num text-sm text-aco">{codigoChamado(chamado.id)}</span>
          <StatusSelo status={chamado.status} />
          <PrioridadeSelo prioridade={chamado.prioridade} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{chamado.titulo}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Conversa */}
        <section className="rounded-lg border border-borda bg-white shadow-painel" aria-label="Conversa">
          <ol className="space-y-5 p-5 sm:p-6">
            <li className="flex gap-3">
              <Avatar nome={chamado.usuario?.nome} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{chamado.usuario?.nome ?? "Usuário removido"}</span>{" "}
                  <span className="text-aco">abriu o chamado</span>{" "}
                  <time className="text-xs text-aco" dateTime={chamado.createdAt} title={dataHora(chamado.createdAt)}>
                    {tempoRelativo(chamado.createdAt)}
                  </time>
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-marinho">{chamado.descricao}</p>
              </div>
            </li>

            {chamado.interacoes.map((item) =>
              item.tipo === "evento" ? (
                <Evento key={item.id} item={item} />
              ) : (
                <Mensagem key={item.id} item={item} minha={item.usuario_id === user?.id} />
              )
            )}
            <li ref={fimDaConversa} aria-hidden="true" />
          </ol>

          <form onSubmit={enviarMensagem} className="border-t border-borda bg-nevoa/40 p-4 sm:p-5">
            <label htmlFor="nova-mensagem" className="sr-only">Nova mensagem</label>
            <Textarea
              id="nova-mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviarMensagem(e);
              }}
              rows={3}
              placeholder={equipe && !souDono ? `Responder a ${chamado.usuario?.nome?.split(" ")[0] ?? "solicitante"}` : "Escreva uma mensagem para o suporte"}
              className="bg-white"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="hidden text-xs text-aco sm:inline">Ctrl + Enter para enviar</span>
              <Button type="submit" icone={Send} carregando={enviando} disabled={!mensagem.trim()} className="ml-auto">
                Enviar
              </Button>
            </div>
          </form>
        </section>

        {/* Painel lateral */}
        <aside className="space-y-6">
          <section className="rounded-lg border border-borda bg-white p-5 shadow-painel" aria-label="Detalhes do chamado">
            <dl className="space-y-5 text-sm">
              <Propriedade rotulo="Status">
                {equipe ? (
                  <Select
                    value={chamado.status}
                    disabled={salvando === "status"}
                    onChange={(e) => alterar("status", "status", { status: e.target.value }, `Status alterado para ${STATUS[e.target.value].rotulo.toLowerCase()}.`)}
                    aria-label="Status"
                  >
                    {LISTA_STATUS.map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
                  </Select>
                ) : (
                  <AcaoDoSolicitante chamado={chamado} salvando={salvando === "status"} onAlterar={alterar} />
                )}
              </Propriedade>

              <Propriedade rotulo="Prioridade">
                {equipe ? (
                  <Select
                    value={chamado.prioridade}
                    disabled={salvando === "prioridade"}
                    onChange={(e) => alterar("prioridade", "prioridade", { prioridade: e.target.value }, `Prioridade alterada para ${PRIORIDADES[e.target.value].rotulo.toLowerCase()}.`)}
                    aria-label="Prioridade"
                  >
                    {LISTA_PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADES[p].rotulo}</option>)}
                  </Select>
                ) : (
                  <PrioridadeSelo prioridade={chamado.prioridade} />
                )}
              </Propriedade>

              <Propriedade rotulo="Responsável">
                {equipe ? (
                  <>
                    <Select
                      value={chamado.responsavel?.id ?? ""}
                      disabled={salvando === "responsavel"}
                      onChange={(e) => {
                        const novo = e.target.value ? Number(e.target.value) : null;
                        const nome = membrosEquipe.find((m) => m.id === novo)?.nome;
                        alterar("responsavel", "responsavel", { responsavel_id: novo }, novo ? `Chamado atribuído a ${nome}.` : "Responsável removido.");
                      }}
                      aria-label="Responsável"
                    >
                      <option value="">Sem responsável</option>
                      {membrosEquipe.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </Select>
                    {chamado.responsavel?.id !== user?.id && chamado.status !== "resolvido" && (
                      <button
                        type="button"
                        onClick={() => alterar("responsavel", "responsavel", { responsavel_id: user.id }, "Você assumiu o chamado.")}
                        className="mt-2 text-sm font-medium text-azul hover:underline"
                      >
                        Atribuir a mim
                      </button>
                    )}
                  </>
                ) : chamado.responsavel ? (
                  <Pessoa nome={chamado.responsavel.nome} />
                ) : (
                  <span className="text-aco">Aguardando um técnico</span>
                )}
              </Propriedade>

              <Propriedade rotulo="Solicitante">
                <Pessoa nome={chamado.usuario?.nome ?? "Usuário removido"} detalhe={chamado.usuario?.email} />
              </Propriedade>

              <div className="grid grid-cols-2 gap-4 border-t border-borda pt-5">
                <Propriedade rotulo="Aberto em">
                  <span className="num">{dataHora(chamado.createdAt)}</span>
                </Propriedade>
                <Propriedade rotulo={chamado.resolvido_em ? "Resolvido em" : "Atualizado"}>
                  <span className="num">{dataHora(chamado.resolvido_em || chamado.updatedAt)}</span>
                </Propriedade>
              </div>
            </dl>
          </section>

          <Anexos chamado={chamado} onEnviado={() => carregar({ silencioso: true })} />
        </aside>
      </div>
    </>
  );
}

function Propriedade({ rotulo, children }) {
  return (
    <div>
      <dt className="mb-1.5 text-xs font-medium text-aco">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Pessoa({ nome, detalhe }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar nome={nome} tamanho="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{nome}</span>
        {detalhe && <span className="block truncate text-xs text-aco">{detalhe}</span>}
      </span>
    </span>
  );
}

// O solicitante (perfil colaborador) só encerra ou reabre o próprio chamado
function AcaoDoSolicitante({ chamado, salvando, onAlterar }) {
  const resolvido = chamado.status === "resolvido";
  return (
    <div className="space-y-2.5">
      <StatusSelo status={chamado.status} />
      <Button
        variante="secundario"
        tamanho="sm"
        icone={resolvido ? RotateCcw : CheckCircle2}
        carregando={salvando}
        onClick={() =>
          onAlterar("status", "status", { status: resolvido ? "aberto" : "resolvido" }, resolvido ? "Chamado reaberto." : "Chamado marcado como resolvido.")
        }
        className="w-full justify-center"
      >
        {resolvido ? "Reabrir chamado" : "Marcar como resolvido"}
      </Button>
    </div>
  );
}

function Mensagem({ item, minha }) {
  const daEquipe = ["suporte", "admin"].includes(item.usuario?.perfil);
  return (
    <li className="flex gap-3">
      <Avatar nome={item.usuario?.nome} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{item.usuario?.nome ?? "Usuário removido"}</span>
          {daEquipe && (
            <span className="ml-2 rounded bg-marinho px-1.5 py-0.5 text-[11px] font-medium text-white">Suporte</span>
          )}{" "}
          <time className="text-xs text-aco" dateTime={item.createdAt} title={dataHora(item.createdAt)}>
            {tempoRelativo(item.createdAt)}
          </time>
        </p>
        <div className={`mt-1.5 inline-block max-w-full rounded-lg px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${minha ? "bg-azul-claro" : "bg-nevoa"}`}>
          {item.mensagem}
        </div>
      </div>
    </li>
  );
}

function iconeDoEvento(texto) {
  if (/respons|assumiu|atribuiu/.test(texto)) return UserCheck;
  if (/prioridade/.test(texto)) return SignalHigh;
  if (/resolvido"$/.test(texto)) return CheckCircle2;
  return RefreshCw;
}

// Registro automático: "Rafael Costa assumiu o chamado"
function Evento({ item }) {
  const Icone = iconeDoEvento(item.mensagem);
  return (
    <li className="flex items-center gap-3 pl-1 text-sm text-aco">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-borda bg-white">
        <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <p className="min-w-0">
        <span className="font-medium text-marinho">{item.usuario?.nome ?? "Alguém"}</span> {item.mensagem}{" "}
        <time className="text-xs" dateTime={item.createdAt} title={dataHora(item.createdAt)}>
          {tempoRelativo(item.createdAt)}
        </time>
      </p>
    </li>
  );
}

function Anexos({ chamado, onEnviado }) {
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef(null);

  async function enviar(arquivo) {
    if (!arquivo) return;
    const formData = new FormData();
    formData.append("anexo", arquivo);
    setEnviando(true);
    const toastId = toast.loading(`Enviando ${arquivo.name}...`);
    try {
      await api.post(`/chamados/${chamado.id}/anexos`, formData);
      await onEnviado();
      toast.success("Anexo enviado.", { id: toastId });
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível enviar o anexo."), { id: toastId });
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  // Os anexos exigem login, então são baixados pela API (com o token)
  async function baixar(anexo) {
    try {
      const { data } = await api.get(`/chamados/${chamado.id}/anexos/${anexo.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = anexo.nome_original;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Não foi possível baixar o anexo.");
    }
  }

  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel" aria-label="Anexos">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Paperclip className="h-4 w-4 text-aco" aria-hidden="true" />
        Anexos
        <span className="num font-normal text-aco">{chamado.anexos.length}</span>
      </h2>

      {chamado.anexos.length > 0 && (
        <ul className="mt-3 space-y-1">
          {chamado.anexos.map((anexo) => {
            const Icone = /\.pdf$/i.test(anexo.nome_original) ? FileText : ImageIcon;
            return (
              <li key={anexo.id}>
                <button
                  type="button"
                  onClick={() => baixar(anexo)}
                  className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-nevoa"
                  title={`Baixar ${anexo.nome_original}`}
                >
                  <Icone className="h-4 w-4 shrink-0 text-aco" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{anexo.nome_original}</span>
                  <Download className="h-4 w-4 shrink-0 text-aco opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files[0]); }}
        className={`mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-5 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
          arrastando ? "border-azul bg-azul-claro/60" : "border-borda hover:border-aco/60 hover:bg-nevoa/50"
        } ${enviando ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadCloud className="h-5 w-5 text-aco" aria-hidden="true" />
        <span className="text-sm font-medium">{arrastando ? "Solte para enviar" : "Arraste um arquivo ou clique"}</span>
        <span className="text-xs text-aco">Imagens ou PDF, até 10 MB</span>
        <input
          ref={entrada}
          type="file"
          accept={TIPOS_ACEITOS}
          className="sr-only"
          onChange={(e) => enviar(e.target.files[0])}
        />
      </label>
    </section>
  );
}

function CarregandoDetalhe() {
  return (
    <div role="status" aria-label="Carregando chamado">
      <Esqueleto className="h-4 w-32" />
      <Esqueleto className="mt-5 h-7 w-2/3" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Esqueleto className="h-80 rounded-lg" />
        <Esqueleto className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
