// src/pages/Admin.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Search, Users, CircleCheck } from "lucide-react";
import api, { mensagemDeErro } from "../services/api";
import { PERFIS, LISTA_PERFIS, PRIORIDADES, LISTA_PRIORIDADES, iconeCategoria } from "../config/dominio";
import { codigoChamado, tempoRelativo, duracaoHoras, dataCurta } from "../utils/formatar";
import Cabecalho from "../components/layout/Cabecalho";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Campo";
import { ConfirmarModal } from "../components/ui/Modal";
import { Avatar, PrioridadeSelo, StatusSelo } from "../components/ui/Selos";
import { Esqueleto, Vazio } from "../components/ui/Estados";
import GraficoPorDia from "../components/admin/GraficoPorDia";
import { PrazoTexto } from "../components/ui/Prazo";
import NovoUsuarioModal from "../components/NovoUsuarioModal";
import GestaoCatalogo from "../components/admin/GestaoCatalogo";
import GestaoGrupos from "../components/admin/GestaoGrupos";

const ABAS = [
  { id: "visao-geral", rotulo: "Visão geral", Componente: VisaoGeral },
  { id: "catalogo", rotulo: "Catálogo", Componente: GestaoCatalogo },
  { id: "grupos", rotulo: "Grupos", Componente: GestaoGrupos },
  { id: "usuarios", rotulo: "Usuários", Componente: GestaoUsuarios },
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.find((a) => a.id === params.get("aba")) || ABAS[0];

  return (
    <>
      <Cabecalho titulo="Administração" descricao="Acompanhe o atendimento, configure o catálogo e gerencie quem usa o sistema." />
      <div className="-mx-4 mb-6 overflow-x-auto border-b border-borda sm:mx-0">
        <nav className="flex gap-1 px-4 sm:px-0" aria-label="Seções da administração">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setParams(a.id === ABAS[0].id ? {} : { aba: a.id }, { replace: true })}
              aria-current={aba.id === a.id ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                aba.id === a.id ? "border-azul text-marinho" : "border-transparent text-aco hover:text-marinho"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>
      </div>
      <aba.Componente />
    </>
  );
}

/* ---------------------------- Visão geral ---------------------------- */

function VisaoGeral() {
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    // fuso: os dias do gráfico seguem o horário de quem está vendo
    api.get("/admin/resumo", { params: { fuso: new Date().getTimezoneOffset() } })
      .then(({ data }) => setResumo(data))
      .catch((error) => toast.error(mensagemDeErro(error, "Erro ao carregar os indicadores.")));
  }, []);

  if (!resumo) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando indicadores">
        <Esqueleto className="h-28 rounded-lg" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Esqueleto className="h-80 rounded-lg" />
          <Esqueleto className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  const { chamados, resolucao, sla } = resumo;
  const pct = (valor) => (valor === null ? "sem dados" : `${valor}%`);
  const pendentes = chamados.porStatus.aberto + chamados.porStatus["em andamento"];

  return (
    <div className="space-y-6">
      {/* Faixa de métricas */}
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-borda bg-white shadow-painel lg:grid-cols-4" aria-label="Indicadores">
        <Metrica rotulo="Pendentes" valor={pendentes} detalhe={`${chamados.semResponsavel} sem responsável`} alerta={chamados.semResponsavel > 0} />
        <Metrica
          rotulo="Com prazo estourado"
          valor={sla.estourados}
          detalhe={`${sla.emRisco} em risco, ${sla.semResposta} sem primeira resposta no prazo`}
          alerta={sla.estourados > 0}
          destaqueValor={sla.estourados > 0}
        />
        <Metrica
          rotulo={`Resolvidos em ${resolucao.periodoDias} dias`}
          valor={resolucao.resolvidos}
          detalhe={`Tempo médio de ${duracaoHoras(resolucao.horasMedias)}`}
        />
        <Metrica
          rotulo="Resolvidos dentro do prazo"
          valor={pct(sla.solucao.percentual)}
          detalhe={`Primeira resposta no prazo em ${pct(sla.resposta.percentual)} dos chamados`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GraficoPorDia dados={resumo.porDia} />
        <PendentesPorPrioridade valores={chamados.pendentesPorPrioridade} total={pendentes} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FilaPorGrupo grupos={resumo.porGrupo} />
        <PorCategoria dados={resumo.porCategoria} />
      </div>

      <DesempenhoEquipe equipe={resumo.equipe} />

      <PendentesAntigos chamados={resumo.pendentesMaisAntigos} />
    </div>
  );
}

function Metrica({ rotulo, valor, detalhe, alerta, destaqueValor }) {
  return (
    <div className="border-borda p-5 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
      <p className="text-sm text-aco">{rotulo}</p>
      <p className={`num mt-1 text-3xl font-semibold tracking-tight ${destaqueValor ? "text-prioridade-critica" : ""}`}>{valor}</p>
      {detalhe && (
        <p className={`mt-1 text-xs ${alerta ? "font-medium text-prioridade-alta" : "text-aco"}`}>{detalhe}</p>
      )}
    </div>
  );
}

// Barras horizontais simples: o valor fica na ponta de cada barra
function PendentesPorPrioridade({ valores, total }) {
  const maximo = Math.max(1, ...Object.values(valores));
  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel">
      <h2 className="font-semibold">Pendentes por prioridade</h2>
      <p className="mt-1 text-sm text-aco">{total} chamados aguardando solução</p>
      <ul className="mt-6 space-y-4">
        {LISTA_PRIORIDADES.map((p) => (
          <li key={p} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
            <PrioridadeSelo prioridade={p} />
            <div className="flex items-center gap-2" title={`${PRIORIDADES[p].rotulo}: ${valores[p]} pendente(s)`}>
              <div className="h-3 flex-1 rounded-sm bg-nevoa">
                <div
                  className={`h-3 rounded-r-[4px] rounded-l-sm ${PRIORIDADES[p].cor}`}
                  style={{ width: `${(valores[p] / maximo) * 100}%` }}
                />
              </div>
              <span className="num w-6 text-right text-sm font-medium">{valores[p]}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Barras horizontais de uma série só: total de chamados por categoria no período
function PorCategoria({ dados }) {
  const ordenados = [...dados].sort((a, b) => b.total - a.total);
  const maximo = Math.max(1, ...ordenados.map((d) => d.total));
  return (
    <section className="rounded-lg border border-borda bg-white p-5 shadow-painel">
      <h2 className="font-semibold">Chamados por categoria</h2>
      <p className="mt-1 text-sm text-aco">Abertos nos últimos 30 dias</p>
      <ul className="mt-5 space-y-3.5">
        {ordenados.map(({ id, nome, icone, total, pendentes }) => {
          const Icone = iconeCategoria(icone);
          return (
            <li key={id} title={`${nome}: ${total} chamado(s), ${pendentes} pendente(s)`}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Icone className="h-3.5 w-3.5 text-aco" aria-hidden="true" />
                  {nome}
                </span>
                <span className="num text-xs text-aco">
                  <span className="text-sm font-medium text-marinho">{total}</span>
                  {pendentes > 0 && ` (${pendentes} pendente${pendentes > 1 ? "s" : ""})`}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-sm bg-nevoa">
                <div className="h-2 rounded-r-[4px] rounded-l-sm bg-azul" style={{ width: `${(total / maximo) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Fila atual de cada grupo técnico, com link para a fila filtrada
function FilaPorGrupo({ grupos }) {
  return (
    <section className="rounded-lg border border-borda bg-white shadow-painel">
      <div className="p-5 pb-3">
        <h2 className="font-semibold">Fila por grupo</h2>
        <p className="mt-1 text-sm text-aco">Chamados pendentes em cada grupo técnico</p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y border-borda bg-nevoa/60 text-left text-xs text-aco">
            <tr>
              <th className="px-5 py-2 font-medium">Grupo</th>
              <th className="px-3 py-2 text-right font-medium">Pendentes</th>
              <th className="px-3 py-2 text-right font-medium">Sem responsável</th>
              <th className="px-5 py-2 text-right font-medium">Atrasados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {grupos.map((g) => (
              <tr key={g.id} className="relative hover:bg-nevoa/50">
                <td className="px-5 py-3">
                  <Link to={`/chamados?grupo=${g.id}`} className="inline-flex items-center gap-2 font-medium after:absolute after:inset-0">
                    <Users className="h-4 w-4 text-aco" aria-hidden="true" />
                    {g.nome}
                  </Link>
                </td>
                <td className="num px-3 py-3 text-right">{g.pendentes}</td>
                <td className={`num px-3 py-3 text-right ${g.semResponsavel ? "font-medium text-prioridade-alta" : "text-aco"}`}>{g.semResponsavel}</td>
                <td className={`num px-5 py-3 text-right ${g.estourados ? "font-medium text-prioridade-critica" : "text-aco"}`}>{g.estourados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DesempenhoEquipe({ equipe }) {
  return (
    <section className="rounded-lg border border-borda bg-white shadow-painel">
      <div className="p-5 pb-3">
        <h2 className="font-semibold">Equipe de suporte</h2>
        <p className="mt-1 text-sm text-aco">Carga atual e entregas nos últimos 30 dias</p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y border-borda bg-nevoa/60 text-left text-xs text-aco">
            <tr>
              <th className="px-5 py-2 font-medium">Técnico</th>
              <th className="px-3 py-2 text-right font-medium">Pendentes</th>
              <th className="px-3 py-2 text-right font-medium">Resolvidos</th>
              <th className="px-3 py-2 text-right font-medium">No prazo</th>
              <th className="px-5 py-2 text-right font-medium">Tempo médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {equipe.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar nome={m.nome} tamanho="sm" />
                    <span className="font-medium">{m.nome}</span>
                  </span>
                </td>
                <td className="num px-3 py-3 text-right">{m.pendentes}</td>
                <td className="num px-3 py-3 text-right">{m.resolvidos}</td>
                <td className="num px-3 py-3 text-right">{m.noPrazo === null ? "—" : `${m.noPrazo}%`}</td>
                <td className="num px-5 py-3 text-right text-aco">{m.horasMedias === null ? "—" : duracaoHoras(m.horasMedias)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PendentesAntigos({ chamados }) {
  return (
    <section className="rounded-lg border border-borda bg-white shadow-painel">
      <div className="p-5 pb-3">
        <h2 className="font-semibold">Pendentes há mais tempo</h2>
        <p className="mt-1 text-sm text-aco">Chamados não resolvidos, do mais antigo para o mais novo</p>
      </div>
      {chamados.length === 0 ? (
        <Vazio icone={CircleCheck} titulo="Nenhum chamado pendente" texto="A fila está em dia." />
      ) : (
        <ul className="divide-y divide-borda border-t border-borda">
          {chamados.map((c) => (
            <li key={c.id} className="relative flex hover:bg-nevoa/50">
              <span className={`w-1 shrink-0 ${PRIORIDADES[c.prioridade]?.cor}`} aria-hidden="true" />
              <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/chamado/${c.id}`} className="font-medium after:absolute after:inset-0">
                    <span className="num mr-2 text-xs font-normal text-aco">{codigoChamado(c.id)}</span>
                    {c.titulo}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-aco">
                    Aberto {tempoRelativo(c.createdAt)}{c.grupo ? ` · ${c.grupo.nome}` : ""} · {c.responsavel ? `com ${c.responsavel.nome}` : "sem responsável"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusSelo status={c.status} />
                  <PrazoTexto sla={c.sla.solucao} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --------------------------- Gestão de usuários --------------------------- */

function GestaoUsuarios() {
  const { user: eu } = useOutletContext();
  const [usuarios, setUsuarios] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [salvandoId, setSalvandoId] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // usuário a desativar

  const carregar = useCallback(() => {
    api.get("/usuarios")
      .then(({ data }) => setUsuarios(data))
      .catch((error) => toast.error(mensagemDeErro(error, "Erro ao carregar os usuários.")));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios ?? []).filter((u) =>
      (!filtroPerfil || u.perfil === filtroPerfil) &&
      (!filtroSituacao || (filtroSituacao === "ativos" ? u.ativo : !u.ativo)) &&
      (!termo || `${u.nome} ${u.email}`.toLowerCase().includes(termo))
    );
  }, [usuarios, busca, filtroPerfil, filtroSituacao]);

  const substituir = (atualizado) =>
    setUsuarios((lista) => lista.map((u) => (u.id === atualizado.id ? { ...u, ...atualizado } : u)));

  async function alterarPerfil(usuario, perfil) {
    setSalvandoId(usuario.id);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}/perfil`, { perfil });
      substituir(data);
      toast.success(`${data.nome} agora é ${PERFIS[data.perfil].rotulo.toLowerCase()}.`);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível alterar o perfil."));
    } finally {
      setSalvandoId(null);
    }
  }

  async function alterarSituacao(usuario, ativo) {
    setSalvandoId(usuario.id);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}/status`, { ativo });
      substituir(data);
      toast.success(`Conta de ${data.nome} ${data.ativo ? "reativada" : "desativada"}.`);
      setConfirmar(null);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível alterar a conta."));
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <section className="rounded-lg border border-borda bg-white shadow-painel">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aco" aria-hidden="true" />
          <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" className="pl-9" />
        </div>
        <Select value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} aria-label="Filtrar por perfil" className="w-auto">
          <option value="">Todos os perfis</option>
          {LISTA_PERFIS.map((p) => <option key={p} value={p}>{PERFIS[p].rotulo}</option>)}
        </Select>
        <Select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} aria-label="Filtrar por situação" className="w-auto">
          <option value="">Ativos e desativados</option>
          <option value="ativos">Só ativos</option>
          <option value="inativos">Só desativados</option>
        </Select>
        <Button icone={UserPlus} onClick={() => setNovoAberto(true)}>Novo usuário</Button>
      </div>

      {!usuarios ? (
        <div className="space-y-3 p-5 pt-0">{[1, 2, 3, 4].map((i) => <Esqueleto key={i} className="h-12" />)}</div>
      ) : filtrados.length === 0 ? (
        <Vazio icone={Users} titulo="Nenhum usuário encontrado" texto="Ajuste a busca ou os filtros." />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-borda bg-nevoa/60 text-left text-xs text-aco">
              <tr>
                <th className="px-5 py-2 font-medium">Usuário</th>
                <th className="px-3 py-2 font-medium">Perfil</th>
                <th className="px-3 py-2 text-right font-medium">Chamados</th>
                <th className="px-3 py-2 font-medium">Desde</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-5 py-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {filtrados.map((u) => {
                const souEu = u.id === eu?.id;
                return (
                  <tr key={u.id} className={u.ativo ? "" : "bg-nevoa/40"}>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-3 ${u.ativo ? "" : "opacity-60"}`}>
                        <Avatar nome={u.nome} />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {u.nome}
                            {souEu && <span className="ml-2 text-xs font-normal text-aco">você</span>}
                          </span>
                          <span className="block text-xs text-aco">{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={u.perfil}
                        onChange={(e) => alterarPerfil(u, e.target.value)}
                        disabled={souEu || salvandoId === u.id}
                        aria-label={`Perfil de ${u.nome}`}
                        title={souEu ? "Você não pode alterar o seu próprio perfil" : undefined}
                        className="h-9 w-40"
                      >
                        {LISTA_PERFIS.map((p) => <option key={p} value={p}>{PERFIS[p].rotulo}</option>)}
                      </Select>
                    </td>
                    <td className="num px-3 py-3 text-right">{u.total_chamados}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-aco">{dataCurta(u.createdAt)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.ativo ? "text-emerald-800" : "text-aco"}`}>
                        <span className={`h-2 w-2 rounded-full ${u.ativo ? "bg-emerald-600" : "bg-aco/50"}`} aria-hidden="true" />
                        {u.ativo ? "Ativo" : "Desativado"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!souEu && (u.ativo ? (
                        <Button variante="perigo" tamanho="sm" onClick={() => setConfirmar(u)}>Desativar</Button>
                      ) : (
                        <Button variante="secundario" tamanho="sm" carregando={salvandoId === u.id} onClick={() => alterarSituacao(u, true)}>
                          Reativar
                        </Button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {novoAberto && (
        <NovoUsuarioModal
          onFechar={() => setNovoAberto(false)}
          onCriado={(novo) => {
            setNovoAberto(false);
            setUsuarios((lista) => [...lista, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
          }}
        />
      )}

      {confirmar && (
        <ConfirmarModal
          titulo={`Desativar a conta de ${confirmar.nome}?`}
          mensagem="A pessoa perde o acesso imediatamente, mesmo que esteja com o sistema aberto. Os chamados e mensagens dela continuam no histórico, e você pode reativar a conta depois."
          rotuloConfirmar="Desativar conta"
          perigo
          carregando={salvandoId === confirmar.id}
          onConfirmar={() => alterarSituacao(confirmar, false)}
          onFechar={() => setConfirmar(null)}
        />
      )}
    </section>
  );
}
