// src/pages/AbrirChamado.jsx
// Formulário de abertura de uma subcategoria do catálogo.
//
// 1. Seus dados: nome, e-mail, setor e cargo vêm do cadastro (somente
//    leitura); ramal e local vêm preenchidos, mas podem ser trocados
// 2. Detalhes: perguntas específicas da subcategoria
// 3. O problema: assunto (com sugestões), descrição (com modelo) e anexos
//
// Ao lado, o resumo do que o catálogo define (prioridade, prazos e grupo),
// os chamados parecidos já abertos e, se o assunto digitado combinar
// melhor com outro serviço, a sugestão de trocar.
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronRight, Lock, Sparkles, FileText, Paperclip, X, Clock, Users, AlertTriangle, ArrowLeftRight, SearchX,
} from "lucide-react";
import api, { isEquipe, mensagemDeErro, DEMO_LOCAL } from "../services/api";
import { iconeCategoria } from "../config/dominio";
import { codigoChamado, horasDePrazo, tempoRelativo } from "../utils/formatar";
import { useCatalogo, acharSubcategoria } from "../hooks/useCatalogo";
import { criarIndice, buscar, sugerirTitulos, modeloDescricao } from "../utils/buscaCatalogo";
import Button from "../components/ui/Button";
import Campo, { Input, Select, Textarea } from "../components/ui/Campo";
import { PrioridadeSelo, StatusSelo } from "../components/ui/Selos";
import { Esqueleto, Vazio } from "../components/ui/Estados";

const PENDENTES = "aberto,em andamento";
const TIPOS_ANEXO = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
const MAX_ANEXOS = 3;
const LIMITE_MB = DEMO_LOCAL ? 1 : 10;

export default function AbrirChamado() {
  const { subcategoriaId } = useParams();
  const { state } = useLocation();
  const { catalogo, carregando } = useCatalogo();
  const sub = useMemo(() => acharSubcategoria(catalogo, Number(subcategoriaId)), [catalogo, subcategoriaId]);

  if (carregando) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando formulário">
        <Esqueleto className="h-8 w-80 rounded" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Esqueleto className="h-[520px] rounded-lg" />
          <Esqueleto className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="rounded-lg border border-borda bg-white shadow-painel">
        <Vazio
          icone={SearchX}
          titulo="Serviço não encontrado"
          texto="Esta opção não existe ou foi desativada no catálogo."
          acao={<Link to="/abrir" className="font-medium text-azul hover:underline">Voltar para a Central de serviços</Link>}
        />
      </div>
    );
  }

  // A chave reinicia o formulário quando a pessoa troca de serviço
  return <Formulario key={sub.id} sub={sub} catalogo={catalogo} inicial={state || {}} />;
}

function Formulario({ sub, catalogo, inicial }) {
  const navigate = useNavigate();
  const { user, atualizarContadores } = useOutletContext();
  const [eu, setEu] = useState(null);
  const [titulo, setTitulo] = useState(inicial.titulo || "");
  const [descricao, setDescricao] = useState(inicial.descricao || "");
  const [respostas, setRespostas] = useState({});
  const [erros, setErros] = useState({});
  const [contato, setContato] = useState("");
  const [local, setLocal] = useState("");
  const [salvarPadrao, setSalvarPadrao] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const campoArquivo = useRef(null);
  const Icone = iconeCategoria(sub.pai.icone);

  // Dados do funcionário, sempre atualizados, para o preenchimento automático
  useEffect(() => {
    api.get("/me").then(({ data }) => {
      setEu(data);
      setContato(data.ramal || "");
      setLocal(data.localizacao || "");
    }).catch(() => setEu(user));
  }, [user]);

  const contatoMudou = eu && (contato.trim() !== (eu.ramal || "") || local.trim() !== (eu.localizacao || ""));

  // Sugestões de título e, se o assunto combinar melhor com outro serviço, o aviso
  const tituloAdiado = useDeferredValue(titulo);
  const sugestoes = useMemo(() => sugerirTitulos(sub, respostas, tituloAdiado), [sub, respostas, tituloAdiado]);
  const indice = useMemo(() => criarIndice(catalogo), [catalogo]);
  const outroServico = useMemo(() => {
    const resultados = buscar(indice, tituloAdiado, 3);
    const [melhor] = resultados;
    const esteAparece = resultados.some((r) => r.sub.id === sub.id);
    return melhor && !esteAparece && melhor.pontos >= 5 ? melhor : null;
  }, [indice, tituloAdiado, sub.id]);

  function responder(chave, valor) {
    setRespostas((r) => ({ ...r, [chave]: valor }));
    setErros((e) => ({ ...e, [chave]: null }));
  }

  function usarModelo() {
    const modelo = modeloDescricao(sub);
    setDescricao((atual) => (atual.trim() ? `${atual.trimEnd()}\n\n${modelo}` : modelo));
  }

  function adicionarArquivos(lista) {
    const novos = [...lista].filter((arquivo) => {
      if (!TIPOS_ANEXO.includes(arquivo.type)) {
        toast.error(`"${arquivo.name}": envie imagens (JPG, PNG, GIF) ou PDF.`);
        return false;
      }
      if (arquivo.size > LIMITE_MB * 1024 * 1024) {
        toast.error(`"${arquivo.name}" passa de ${LIMITE_MB} MB.`);
        return false;
      }
      return true;
    });
    setArquivos((atuais) => [...atuais, ...novos].slice(0, MAX_ANEXOS));
  }

  function trocarPara(outro) {
    navigate(`/abrir/${outro.id}`, { state: { titulo, descricao } });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Perguntas obrigatórias (os botões de opção não usam a validação do navegador)
    const faltando = Object.fromEntries(
      (sub.campos || []).filter((c) => c.obrigatorio && !String(respostas[c.chave] ?? "").trim()).map((c) => [c.chave, "Obrigatório."])
    );
    if (Object.keys(faltando).length) {
      setErros(faltando);
      toast.error("Responda as perguntas obrigatórias.");
      document.getElementById(`campo-${Object.keys(faltando)[0]}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post("/chamados", {
        titulo, descricao, categoria_id: sub.id, respostas, contato, local,
      });

      // Anexos e contato padrão: se falharem, o chamado já está aberto
      const falhas = [];
      for (const arquivo of arquivos) {
        const corpo = new FormData();
        corpo.append("anexo", arquivo);
        try {
          await api.post(`/chamados/${data.id}/anexos`, corpo);
        } catch {
          falhas.push(arquivo.name);
        }
      }
      if (salvarPadrao && contatoMudou) {
        await api.put("/me", { ramal: contato, localizacao: local }).catch(() => {});
      }

      toast.success(`Chamado ${codigoChamado(data.id)} aberto. A equipe ${data.grupo?.nome ?? "de suporte"} foi avisada.`);
      if (falhas.length) toast.error(`Não foi possível anexar: ${falhas.join(", ")}. Anexe de novo pelo chamado.`);
      atualizarContadores();
      navigate(`/chamado/${data.id}`);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível abrir o chamado."));
      setEnviando(false);
    }
  }

  return (
    <>
      <nav aria-label="Caminho" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-aco">
        <Link to="/abrir" className="hover:text-marinho hover:underline">Central de serviços</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{sub.pai.nome}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium text-marinho" aria-current="page">{sub.nome}</span>
      </nav>

      <header className="mb-6 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-azul-claro text-azul">
          <Icone className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{sub.nome}</h1>
          <p className="text-sm text-aco">{sub.descricao || `Abrir chamado em ${sub.pai.nome}`}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Secao numero={1} titulo="Seus dados" descricao="Preenchidos pelo seu cadastro. Confira o contato e o local do atendimento.">
            <dl className="grid gap-x-6 gap-y-3 rounded-md bg-nevoa/60 px-4 py-3 text-sm sm:grid-cols-2" aria-label="Dados do solicitante">
              <DadoAutomatico rotulo="Nome" valor={eu?.nome ?? user?.nome} />
              <DadoAutomatico rotulo="E-mail" valor={eu?.email ?? user?.email} />
              <DadoAutomatico rotulo="Setor" valor={eu?.setor} />
              <DadoAutomatico rotulo="Cargo" valor={eu?.cargo} />
            </dl>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Ramal ou telefone para contato">
                {(p) => <Input {...p} value={contato} onChange={(e) => setContato(e.target.value)} maxLength={40} placeholder="Ex.: 2034" />}
              </Campo>
              <Campo rotulo="Local do atendimento">
                {(p) => <Input {...p} value={local} onChange={(e) => setLocal(e.target.value)} maxLength={120} placeholder="Ex.: Sede · 2º andar" />}
              </Campo>
            </div>
            {contatoMudou && (
              <label className="mt-3 flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={salvarPadrao} onChange={(e) => setSalvarPadrao(e.target.checked)} className="h-4 w-4 rounded border-borda accent-azul" />
                Usar este contato e local nos próximos chamados
              </label>
            )}
          </Secao>

          {sub.campos?.length > 0 && (
            <Secao numero={2} titulo="Detalhes" descricao={`Perguntas sobre ${sub.nome.toLowerCase()} que ajudam a equipe a resolver mais rápido.`}>
              <div className="grid gap-5 sm:grid-cols-2">
                {sub.campos.map((campo) => (
                  <CampoDoFormulario
                    key={campo.chave}
                    campo={campo}
                    valor={respostas[campo.chave] ?? ""}
                    erro={erros[campo.chave]}
                    onMudar={(v) => responder(campo.chave, v)}
                  />
                ))}
              </div>
            </Secao>
          )}

          <Secao numero={sub.campos?.length ? 3 : 2} titulo="O problema">
            <Campo rotulo="Assunto">
              {(p) => (
                <Input
                  {...p}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Resuma em uma frase"
                  minLength={3}
                  maxLength={255}
                  required
                />
              )}
            </Campo>
            {sugestoes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2" aria-label="Sugestões de assunto">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-aco">
                  <Sparkles className="h-3.5 w-3.5 text-azul" aria-hidden="true" />
                  Sugestões:
                </span>
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTitulo(s)}
                    className="rounded-full border border-borda bg-white px-3 py-1 text-xs text-marinho transition-colors hover:border-azul hover:bg-azul-claro/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {outroServico && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-azul/30 bg-azul-claro/50 px-3 py-2 text-sm" role="status">
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-azul" aria-hidden="true" />
                <span className="flex-1">
                  Pelo assunto, isto parece ser <strong className="font-semibold">{outroServico.pai.nome} › {outroServico.sub.nome}</strong>.
                </span>
                <Button variante="secundario" tamanho="sm" onClick={() => trocarPara(outroServico.sub)}>Trocar</Button>
              </div>
            )}

            <div className="mt-5">
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <label htmlFor="descricao" className="block text-sm font-medium text-marinho">Descrição</label>
                <button type="button" onClick={usarModelo} className="inline-flex items-center gap-1 text-xs font-medium text-azul hover:underline">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Usar modelo de descrição
                </button>
              </div>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={6}
                required
                aria-describedby="descricao-ajuda"
                placeholder="Conte o que aconteceu, desde quando e o que você já tentou."
              />
              <p id="descricao-ajuda" className="mt-1.5 text-xs text-aco">Quanto mais detalhes, mais rápido o atendimento.</p>
            </div>

            <div className="mt-5">
              <p className="mb-1.5 text-sm font-medium text-marinho">Anexos <span className="font-normal text-aco">(opcional)</span></p>
              <input
                ref={campoArquivo}
                type="file"
                multiple
                accept={TIPOS_ANEXO.join(",")}
                className="sr-only"
                aria-label="Escolher arquivos"
                onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ""; }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {arquivos.map((arquivo, i) => (
                  <span key={`${arquivo.name}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-borda bg-nevoa/60 py-1 pl-2.5 pr-1 text-xs">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-aco" aria-hidden="true" />
                    <span className="truncate">{arquivo.name}</span>
                    <button
                      type="button"
                      onClick={() => setArquivos((lista) => lista.filter((_, j) => j !== i))}
                      className="rounded p-0.5 text-aco hover:bg-borda hover:text-marinho"
                      aria-label={`Remover ${arquivo.name}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                {arquivos.length < MAX_ANEXOS && (
                  <Button variante="secundario" tamanho="sm" icone={Paperclip} onClick={() => campoArquivo.current?.click()}>
                    Adicionar print ou PDF
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-aco">Até {MAX_ANEXOS} arquivos de imagem ou PDF, com até {LIMITE_MB} MB cada.</p>
            </div>
          </Secao>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variante="secundario" onClick={() => navigate("/abrir")}>Cancelar</Button>
            <Button type="submit" carregando={enviando}>Abrir chamado</Button>
          </div>
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-6">
          <Resumo sub={sub} />
          <Parecidos sub={sub} />
        </aside>
      </form>
    </>
  );
}

function Secao({ numero, titulo, descricao, children }) {
  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel sm:p-6" aria-labelledby={`secao-${numero}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marinho text-xs font-semibold text-white" aria-hidden="true">
          {numero}
        </span>
        <div>
          <h2 id={`secao-${numero}`} className="font-semibold leading-6">{titulo}</h2>
          {descricao && <p className="text-sm text-aco">{descricao}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function DadoAutomatico({ rotulo, valor }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-aco">
        {rotulo}
        <Lock className="h-3 w-3" aria-label="preenchido automaticamente" />
      </dt>
      <dd className={`truncate font-medium ${valor ? "" : "font-normal text-aco"}`}>{valor || "Não informado"}</dd>
    </div>
  );
}

// Pergunta específica: seleção curta vira botões; longa vira lista; texto e número viram campo
function CampoDoFormulario({ campo, valor, erro, onMudar }) {
  const idCampo = `campo-${campo.chave}`;
  const rotulo = (
    <>
      {campo.rotulo}
      {campo.obrigatorio ? <span className="text-prioridade-critica" aria-hidden="true"> *</span> : <span className="font-normal text-aco"> (opcional)</span>}
    </>
  );
  const rodape = (erro || campo.ajuda) && (
    <p className={`mt-1.5 text-xs ${erro ? "font-medium text-prioridade-critica" : "text-aco"}`}>{erro || campo.ajuda}</p>
  );

  if (campo.tipo === "selecao" && campo.opcoes.length <= 4) {
    return (
      <fieldset className="sm:col-span-2" aria-invalid={Boolean(erro)} aria-required={campo.obrigatorio}>
        <legend className="mb-1.5 block text-sm font-medium text-marinho">{rotulo}</legend>
        <div className="flex flex-wrap gap-2">
          {campo.opcoes.map((opcao, i) => (
            <label
              key={opcao}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
                valor === opcao ? "border-azul bg-azul-claro/60 font-medium ring-1 ring-azul" : "border-borda hover:border-aco/50"
              }`}
            >
              <input
                type="radio"
                id={i === 0 ? idCampo : undefined}
                name={idCampo}
                value={opcao}
                checked={valor === opcao}
                onChange={() => onMudar(opcao)}
                className="sr-only"
              />
              {opcao}
            </label>
          ))}
        </div>
        {rodape}
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium text-marinho">{rotulo}</label>
      {campo.tipo === "selecao" ? (
        <Select id={idCampo} value={valor} onChange={(e) => onMudar(e.target.value)} aria-invalid={Boolean(erro)}>
          <option value="">Escolha uma opção</option>
          {campo.opcoes.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
        </Select>
      ) : (
        <Input
          id={idCampo}
          type={campo.tipo === "numero" ? "number" : "text"}
          inputMode={campo.tipo === "numero" ? "decimal" : undefined}
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          maxLength={500}
          aria-invalid={Boolean(erro)}
        />
      )}
      {rodape}
    </div>
  );
}

// O que o catálogo define para este serviço
function Resumo({ sub }) {
  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel" aria-label="Resumo do atendimento">
      <h2 className="text-sm font-semibold">Resumo do atendimento</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-aco">Serviço</dt>
          <dd className="text-right font-medium">{sub.pai.nome} › {sub.nome}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-aco">Prioridade</dt>
          <dd><PrioridadeSelo prioridade={sub.prioridade} /></dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-1.5 text-aco"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Primeira resposta</dt>
          <dd className="num font-medium">até {horasDePrazo(sub.sla_resposta_horas)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-1.5 text-aco"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Solução</dt>
          <dd className="num font-medium">até {horasDePrazo(sub.sla_solucao_horas)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-1.5 text-aco"><Users className="h-3.5 w-3.5" aria-hidden="true" />Equipe</dt>
          <dd className="text-right font-medium">{sub.grupo?.nome ?? "Suporte"}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-borda pt-3 text-xs text-aco">
        Definido pelo catálogo de serviços. <Link to="/abrir" className="font-medium text-azul hover:underline">Trocar serviço</Link>
      </p>
    </section>
  );
}

// Chamados do mesmo tipo ainda em aberto: evita abrir duplicado
// (para a equipe, vários abertos ao mesmo tempo podem indicar um incidente maior)
function Parecidos({ sub }) {
  const { user } = useOutletContext();
  const [resultado, setResultado] = useState(null);
  const equipe = isEquipe(user);

  useEffect(() => {
    api.get("/chamados", { params: { categoria: sub.id, status: PENDENTES, ordem: "recentes", porPagina: 3 } })
      .then(({ data }) => setResultado(data))
      .catch(() => {});
  }, [sub.id]);

  if (!resultado?.total) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5" aria-label="Chamados parecidos">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        {equipe
          ? `${resultado.total} ${resultado.total === 1 ? "chamado aberto" : "chamados abertos"} deste tipo`
          : `Você já tem ${resultado.total === 1 ? "um chamado aberto" : `${resultado.total} chamados abertos`} deste tipo`}
      </h2>
      <p className="mt-1 text-xs text-amber-900/80">
        {equipe ? "Vários ao mesmo tempo podem ser um incidente maior." : "Se for o mesmo problema, acompanhe por lá em vez de abrir outro."}
      </p>
      <ul className="mt-3 space-y-2">
        {resultado.dados.map((c) => (
          <li key={c.id} className="relative rounded-md border border-amber-200 bg-white px-3 py-2 text-sm hover:border-amber-400">
            <Link to={`/chamado/${c.id}`} className="block truncate font-medium after:absolute after:inset-0">
              <span className="num mr-1.5 text-xs font-normal text-aco">{codigoChamado(c.id)}</span>
              {c.titulo}
            </Link>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-aco">
              <StatusSelo status={c.status} />
              {tempoRelativo(c.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
