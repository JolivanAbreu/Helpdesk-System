// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api, { usuarioLogado, mensagemDeErro } from "../services/api";
import AppHeader from "../components/AppHeader";
import StatusBadge from "../components/StatusBadge";
import NovoUsuarioModal from "../components/NovoUsuarioModal";

const PERFIS = ["comum", "suporte", "admin"];

// "há 3 dias", "há 5 horas"...
function tempoDesde(data) {
  const minutos = Math.floor((Date.now() - new Date(data)) / 60000);
  if (minutos < 60) return `há ${Math.max(minutos, 1)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? "s" : ""}`;
}

function Indicador({ titulo, valor, detalhe, destaque }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-3xl font-bold mt-1 ${destaque || "text-gray-800"}`}>{valor}</p>
      {detalhe && <p className="text-xs text-gray-500 mt-2">{detalhe}</p>}
    </div>
  );
}

export default function Admin() {
  const eu = usuarioLogado();
  const [resumo, setResumo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvandoId, setSalvandoId] = useState(null);

  async function carregar() {
    try {
      const [r, u] = await Promise.all([api.get("/admin/resumo"), api.get("/usuarios")]);
      setResumo(r.data);
      setUsuarios(u.data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Erro ao carregar a administração."));
    } finally {
      setCarregando(false);
    }
  }

  // Os indicadores dependem dos usuários, então são recarregados após cada alteração
  const recarregarResumo = () =>
    api.get("/admin/resumo").then(({ data }) => setResumo(data)).catch(() => {});

  useEffect(() => {
    carregar();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (filtroPerfil !== "todos" && u.perfil !== filtroPerfil) return false;
      if (filtroSituacao === "ativos" && !u.ativo) return false;
      if (filtroSituacao === "inativos" && u.ativo) return false;
      if (termo && !`${u.nome} ${u.email}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [usuarios, busca, filtroPerfil, filtroSituacao]);

  function substituir(atualizado) {
    setUsuarios((lista) =>
      lista.map((u) => (u.id === atualizado.id ? { ...u, ...atualizado } : u))
    );
  }

  async function alterarPerfil(usuario, perfil) {
    setSalvandoId(usuario.id);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}/perfil`, { perfil });
      substituir(data);
      recarregarResumo();
      toast.success(`${data.nome} agora é ${data.perfil}.`);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível alterar o perfil."));
    } finally {
      setSalvandoId(null);
    }
  }

  async function alternarAtivo(usuario) {
    const ativo = !usuario.ativo;
    if (!ativo && !window.confirm(`Desativar a conta de ${usuario.nome}? A pessoa perde o acesso imediatamente.`)) {
      return;
    }
    setSalvandoId(usuario.id);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}/status`, { ativo });
      substituir(data);
      recarregarResumo();
      toast.success(`Conta de ${data.nome} ${data.ativo ? "reativada" : "desativada"}.`);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível alterar a conta."));
    } finally {
      setSalvandoId(null);
    }
  }

  function handleCriado(novo) {
    setModalAberto(false);
    setUsuarios((lista) => [...lista, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    recarregarResumo();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader />

      <main className="p-4 sm:p-8 space-y-8">
        <h1 className="text-2xl font-semibold text-gray-700">Administração</h1>

        {carregando || !resumo ? (
          <p className="text-gray-600">Carregando...</p>
        ) : (
          <>
            {/* Indicadores */}
            <section aria-label="Indicadores" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Indicador titulo="Chamados" valor={resumo.chamados.total} detalhe="total registrado" />
              <Indicador titulo="Abertos" valor={resumo.chamados.porStatus.aberto} destaque="text-blue-700" detalhe="aguardando atendimento" />
              <Indicador titulo="Em andamento" valor={resumo.chamados.porStatus["em andamento"]} destaque="text-amber-700" />
              <Indicador titulo="Resolvidos" valor={resumo.chamados.porStatus.resolvido} destaque="text-green-700" />
              <Indicador
                titulo="Usuários ativos"
                valor={resumo.usuarios.ativos}
                detalhe={`${resumo.usuarios.porPerfil.comum} comum · ${resumo.usuarios.porPerfil.suporte} suporte · ${resumo.usuarios.porPerfil.admin} admin${
                  resumo.usuarios.inativos ? ` · ${resumo.usuarios.inativos} desativado(s)` : ""
                }`}
              />
            </section>

            {/* Pendentes mais antigos */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Pendentes há mais tempo</h2>
              <p className="text-sm text-gray-500 mb-4">Chamados abertos ou em andamento, do mais antigo para o mais novo.</p>
              {resumo.pendentesMaisAntigos.length === 0 ? (
                <p className="text-gray-600">Nenhum chamado pendente. 🎉</p>
              ) : (
                <ul className="divide-y">
                  {resumo.pendentesMaisAntigos.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/chamado/${c.id}`}
                        className="flex justify-between items-center gap-4 py-3 px-2 rounded-md hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">#{c.id} · {c.titulo}</p>
                          <p className="text-xs text-gray-500">
                            {c.usuario?.nome ?? "Usuário removido"} · aberto {tempoDesde(c.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Usuários */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Usuários</h2>
                <button
                  onClick={() => setModalAberto(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Novo usuário
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  aria-label="Buscar usuários"
                  className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filtroPerfil}
                  onChange={(e) => setFiltroPerfil(e.target.value)}
                  aria-label="Filtrar por perfil"
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="todos">Todos os perfis</option>
                  {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  aria-label="Filtrar por situação"
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="todos">Ativos e desativados</option>
                  <option value="ativos">Só ativos</option>
                  <option value="inativos">Só desativados</option>
                </select>
              </div>

              <div className="relative overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500 border-b">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Usuário</th>
                      <th className="py-2 pr-4 font-medium">Perfil</th>
                      <th className="py-2 pr-4 font-medium text-right">Chamados</th>
                      <th className="py-2 pr-4 font-medium">Desde</th>
                      <th className="py-2 pr-4 font-medium">Situação</th>
                      <th className="py-2 font-medium"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usuariosFiltrados.map((u) => {
                      const souEu = u.id === eu?.id;
                      const salvando = salvandoId === u.id;
                      return (
                        <tr key={u.id} className={u.ativo ? "" : "text-gray-400"}>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-gray-800">
                              {u.nome}
                              {souEu && <span className="ml-2 text-xs text-gray-500">(você)</span>}
                            </p>
                            <p className="text-gray-500">{u.email}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <select
                              value={u.perfil}
                              onChange={(e) => alterarPerfil(u, e.target.value)}
                              disabled={souEu || salvando}
                              aria-label={`Perfil de ${u.nome}`}
                              title={souEu ? "Você não pode alterar o seu próprio perfil" : undefined}
                              className="px-2 py-1 border rounded-md bg-white disabled:bg-gray-50 disabled:text-gray-500"
                            >
                              {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">{u.total_chamados}</td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                u.ativo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {u.ativo ? "ativo" : "desativado"}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {!souEu && (
                              <button
                                onClick={() => alternarAtivo(u)}
                                disabled={salvando}
                                className={`text-sm px-3 py-1 rounded-md border whitespace-nowrap disabled:opacity-60 ${
                                  u.ativo
                                    ? "text-red-600 border-red-200 hover:bg-red-50"
                                    : "text-green-700 border-green-200 hover:bg-green-50"
                                }`}
                              >
                                {u.ativo ? "Desativar" : "Reativar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {usuariosFiltrados.length === 0 && (
                  <p className="text-gray-500 py-6 text-center">Nenhum usuário encontrado com esses filtros.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {modalAberto && (
        <NovoUsuarioModal onFechar={() => setModalAberto(false)} onCriado={handleCriado} />
      )}
    </div>
  );
}
