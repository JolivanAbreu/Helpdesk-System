// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api, {
  TOKEN_KEY,
  USER_KEY,
  usuarioLogado,
  isEquipe,
  mensagemDeErro,
} from "../services/api";
import StatusBadge from "../components/StatusBadge";
import NovoChamadoModal from "../components/NovoChamadoModal";

export default function Dashboard() {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const navigate = useNavigate();
  const user = usuarioLogado();
  const equipe = isEquipe(user);

  async function carregarChamados() {
    try {
      const response = await api.get("/chamados");
      setChamados(response.data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Erro ao carregar chamados."));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarChamados();
  }, []);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/");
  }

  function handleChamadoCriado(chamado) {
    setModalAberto(false);
    navigate(`/chamado/${chamado.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Helpdesk</h1>
          <p className="text-sm text-gray-500">
            {user?.nome} · perfil {user?.perfil}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalAberto(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Abrir Novo Chamado
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          {equipe ? "Todos os chamados" : "Meus chamados"}
        </h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {carregando ? (
            <p className="text-gray-600">Carregando...</p>
          ) : chamados.length === 0 ? (
            <p className="text-gray-600">
              {equipe
                ? "Nenhum chamado registrado ainda."
                : "Você ainda não abriu nenhum chamado."}
            </p>
          ) : (
            <ul className="divide-y">
              {chamados.map((chamado) => (
                <li key={chamado.id}>
                  <Link
                    to={`/chamado/${chamado.id}`}
                    className="flex justify-between items-center gap-4 hover:bg-gray-50 p-3 rounded-md"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-lg text-gray-800">
                        #{chamado.id} · {chamado.titulo}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {chamado.descricao}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {equipe && `${chamado.usuario?.nome ?? "Usuário removido"} · `}
                        {new Date(chamado.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <StatusBadge status={chamado.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {modalAberto && (
        <NovoChamadoModal
          onFechar={() => setModalAberto(false)}
          onCriado={handleChamadoCriado}
        />
      )}
    </div>
  );
}
