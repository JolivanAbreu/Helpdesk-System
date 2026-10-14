// src/pages/Chamados.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Plus, Inbox, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import api, { isEquipe, mensagemDeErro } from "../services/api";
import { PRIORIDADES, LISTA_PRIORIDADES } from "../config/dominio";
import { codigoChamado, tempoRelativo, dataHora } from "../utils/formatar";
import useAtualizacaoPeriodica from "../hooks/useAtualizacaoPeriodica";
import Cabecalho from "../components/layout/Cabecalho";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Campo";
import { StatusSelo, PrioridadeSelo, Avatar, Contador } from "../components/ui/Selos";
import { EsqueletoLinhas, Vazio } from "../components/ui/Estados";

const PENDENTES = "aberto,em andamento";

// Cada aba vira um conjunto de filtros na API
const ABAS_EQUIPE = [
  { id: "pendentes", rotulo: "Pendentes", contador: "pendentes", filtros: { status: PENDENTES } },
  { id: "meus", rotulo: "Atribuídos a mim", contador: "atribuidosAMim", filtros: { status: PENDENTES, responsavel: "eu" } },
  { id: "sem-responsavel", rotulo: "Sem responsável", contador: "semResponsavel", filtros: { status: PENDENTES, responsavel: "nenhum" } },
  { id: "resolvidos", rotulo: "Resolvidos", contador: "resolvidos", filtros: { status: "resolvido" } },
  { id: "todos", rotulo: "Todos", contador: "todos", filtros: {} },
];
const ABAS_COLABORADOR = [
  { id: "pendentes", rotulo: "Em aberto", contador: "pendentes", filtros: { status: PENDENTES } },
  { id: "resolvidos", rotulo: "Resolvidos", contador: "resolvidos", filtros: { status: "resolvido" } },
  { id: "todos", rotulo: "Todos", contador: "todos", filtros: {} },
];

const ORDENS = {
  prioridade: "Mais urgentes primeiro",
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  atualizados: "Atualizados recentemente",
};

const POR_PAGINA = 15;

export default function Chamados() {
  const { user, abrirNovoChamado, atualizarContadores } = useOutletContext();
  const equipe = isEquipe(user);
  const abas = equipe ? ABAS_EQUIPE : ABAS_COLABORADOR;
  const [params, setParams] = useSearchParams();

  const aba = abas.find((a) => a.id === params.get("aba")) || abas[0];
  const prioridade = params.get("prioridade") || "";
  const ordem = params.get("ordem") || (equipe ? "prioridade" : "recentes");
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);
  const buscaUrl = params.get("busca") || "";

  const [busca, setBusca] = useState(buscaUrl);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [assumindo, setAssumindo] = useState(null);

  // Altera um ou mais parâmetros da URL (voltando à página 1 quando o filtro muda)
  const definir = useCallback((novos, manterPagina = false) => {
    setParams((atual) => {
      const p = new URLSearchParams(atual);
      Object.entries(novos).forEach(([chave, valor]) => (valor ? p.set(chave, valor) : p.delete(chave)));
      if (!manterPagina) p.delete("pagina");
      return p;
    }, { replace: true });
  }, [setParams]);

  // Busca com espera de 300 ms após a última tecla
  const ultimaBuscaEnviada = useRef(buscaUrl);
  useEffect(() => {
    const termo = busca.trim();
    if (termo === buscaUrl) return undefined;
    const t = setTimeout(() => {
      ultimaBuscaEnviada.current = termo;
      definir({ busca: termo });
    }, 300);
    return () => clearTimeout(t);
  }, [busca, buscaUrl, definir]);

  // Só copia a URL para o campo quando ela mudou por fora (ex.: botão voltar),
  // para não sobrescrever o que a pessoa ainda está digitando
  useEffect(() => {
    if (buscaUrl !== ultimaBuscaEnviada.current) {
      ultimaBuscaEnviada.current = buscaUrl;
      setBusca(buscaUrl);
    }
  }, [buscaUrl]);

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCarregando(true);
    try {
      const { data } = await api.get("/chamados", {
        params: { ...aba.filtros, prioridade: prioridade || undefined, ordem, pagina, porPagina: POR_PAGINA, busca: buscaUrl || undefined },
      });
      setResultado(data);
    } catch (error) {
      if (!silencioso) toast.error(mensagemDeErro(error, "Erro ao carregar os chamados."));
    } finally {
      setCarregando(false);
    }
  }, [aba, prioridade, ordem, pagina, buscaUrl]);

  useEffect(() => { carregar(); }, [carregar]);
  useAtualizacaoPeriodica(() => carregar({ silencioso: true }), 30000);

  async function assumir(chamado) {
    setAssumindo(chamado.id);
    try {
      await api.put(`/chamados/${chamado.id}/responsavel`, { responsavel_id: user.id });
      toast.success(`Você assumiu o ${codigoChamado(chamado.id)}.`);
      await carregar({ silencioso: true });
      atualizarContadores();
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível assumir o chamado."));
    } finally {
      setAssumindo(null);
    }
  }

  const filtrando = Boolean(buscaUrl || prioridade);
  const chamados = resultado?.dados ?? [];

  return (
    <>
      <Cabecalho
        titulo={equipe ? "Fila de chamados" : "Meus chamados"}
        descricao={equipe ? "Todos os pedidos de suporte da empresa." : "Pedidos de suporte que você abriu."}
        acoes={<Button icone={Plus} onClick={abrirNovoChamado} className="lg:hidden">Novo chamado</Button>}
      />

      {/* Abas */}
      <div className="-mx-4 sm:mx-0 overflow-x-auto border-b border-borda">
        <nav className="flex gap-1 px-4 sm:px-0" aria-label="Filtros rápidos">
          {abas.map((a) => {
            const ativa = a.id === aba.id;
            return (
              <button
                key={a.id}
                onClick={() => definir({ aba: a.id === abas[0].id ? "" : a.id })}
                aria-current={ativa ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativa ? "border-azul text-marinho" : "border-transparent text-aco hover:text-marinho"
                }`}
              >
                {a.rotulo}
                {resultado && <Contador valor={resultado.contadores[a.contador]} ativo={ativa} />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Busca e filtros */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aco" aria-hidden="true" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por assunto, descrição ou código"
            aria-label="Buscar chamados"
            className="pl-9"
          />
        </div>
        <Select value={prioridade} onChange={(e) => definir({ prioridade: e.target.value })} aria-label="Prioridade" className="w-auto">
          <option value="">Todas as prioridades</option>
          {LISTA_PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADES[p].rotulo}</option>)}
        </Select>
        <Select value={ordem} onChange={(e) => definir({ ordem: e.target.value })} aria-label="Ordenar por" className="w-auto">
          {Object.entries(ORDENS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </Select>
      </div>

      {/* Lista */}
      <section className="mt-4 overflow-hidden rounded-lg border border-borda bg-white shadow-painel" aria-busy={carregando}>
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_130px_170px_110px] gap-4 border-b border-borda bg-nevoa/60 px-5 py-2.5 text-xs font-medium text-aco">
          <span>Chamado</span>
          <span>Prioridade</span>
          <span>Status</span>
          <span>Responsável</span>
          <span className="text-right">Atualizado</span>
        </div>

        {carregando && !resultado ? (
          <EsqueletoLinhas />
        ) : chamados.length === 0 ? (
          filtrando ? (
            <Vazio
              icone={SearchX}
              titulo="Nenhum chamado encontrado"
              texto="Tente outra busca ou remova o filtro de prioridade."
              acao={<Button variante="secundario" onClick={() => { setBusca(""); ultimaBuscaEnviada.current = ""; definir({ busca: "", prioridade: "" }); }}>Limpar filtros</Button>}
            />
          ) : (
            <Vazio
              icone={Inbox}
              titulo={aba.id === "pendentes" ? "Nada pendente por aqui" : "Nenhum chamado nesta aba"}
              texto={equipe ? "Quando alguém abrir um chamado, ele aparece nesta fila." : "Precisa de ajuda com algum equipamento ou sistema? Abra um chamado."}
              acao={!equipe && <Button icone={Plus} onClick={abrirNovoChamado}>Novo chamado</Button>}
            />
          )
        ) : (
          <ul className={`divide-y divide-borda transition-opacity ${carregando ? "opacity-60" : ""}`}>
            {chamados.map((c) => (
              <LinhaChamado
                key={c.id}
                chamado={c}
                equipe={equipe}
                assumindo={assumindo === c.id}
                onAssumir={() => assumir(c)}
              />
            ))}
          </ul>
        )}

        {resultado && resultado.total > 0 && (
          <Paginacao resultado={resultado} onMudar={(p) => definir({ pagina: p > 1 ? String(p) : "" }, true)} />
        )}
      </section>
    </>
  );
}

function LinhaChamado({ chamado, equipe, assumindo, onAssumir }) {
  const podeAssumir = equipe && !chamado.responsavel && chamado.status !== "resolvido";
  return (
    <li className="group relative flex hover:bg-nevoa/50 transition-colors">
      {/* Faixa de prioridade: o sinal visual principal da fila */}
      <span className={`w-1 shrink-0 ${PRIORIDADES[chamado.prioridade]?.cor}`} aria-hidden="true" />
      <div className="grid flex-1 grid-cols-1 gap-2 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_110px_130px_170px_110px] md:items-center md:gap-4 md:px-5">
        <div className="min-w-0">
          <Link
            to={`/chamado/${chamado.id}`}
            className="font-medium text-marinho after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-azul"
          >
            <span className="num mr-2 text-xs font-normal text-aco">{codigoChamado(chamado.id)}</span>
            {chamado.titulo}
          </Link>
          <p className="mt-0.5 truncate text-xs text-aco">
            {equipe ? `Aberto por ${chamado.usuario?.nome ?? "usuário removido"}` : `Aberto ${tempoRelativo(chamado.createdAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:contents">
          <PrioridadeSelo prioridade={chamado.prioridade} />
          <div><StatusSelo status={chamado.status} /></div>
          <div className="min-w-0">
            {chamado.responsavel ? (
              <span className="flex items-center gap-2 text-sm">
                <Avatar nome={chamado.responsavel.nome} tamanho="sm" />
                <span className="truncate">{chamado.responsavel.nome}</span>
              </span>
            ) : podeAssumir ? (
              <Button
                variante="secundario"
                tamanho="sm"
                carregando={assumindo}
                onClick={onAssumir}
                className="relative z-10"
              >
                Assumir
              </Button>
            ) : (
              <span className="text-sm text-aco">{chamado.status === "resolvido" ? "—" : "Aguardando técnico"}</span>
            )}
          </div>
          <span className="num ml-auto text-xs text-aco md:text-right" title={dataHora(chamado.updatedAt)}>
            {tempoRelativo(chamado.updatedAt)}
          </span>
        </div>
      </div>
    </li>
  );
}

function Paginacao({ resultado, onMudar }) {
  const { pagina, totalPaginas, total, porPagina } = resultado;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-borda px-5 py-3 text-sm text-aco">
      <span className="num">{inicio}–{fim} de {total}</span>
      <div className="flex gap-2">
        <Button variante="secundario" tamanho="sm" icone={ChevronLeft} disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)}>
          Anterior
        </Button>
        <Button variante="secundario" tamanho="sm" disabled={pagina >= totalPaginas} onClick={() => onMudar(pagina + 1)}>
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
