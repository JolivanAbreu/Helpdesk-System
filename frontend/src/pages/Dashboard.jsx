// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const [chamados, setChamados] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("@HelpDesk:user"));

  useEffect(() => {
    // Busca os chamados assim que o componente é montado
    api
      .get("/chamados")
      .then((response) => {
        setChamados(response.data);
      })
      .catch(() => {
        // Se der erro (ex: token expirado), desloga o usuário
        handleLogout();
      });
  }, []);

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  // Se por algum motivo não encontrar o usuário no localStorage, redireciona para o login
  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">
          Dashboard de {user.nome}
        </h1>
        <div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md mr-4 hover:bg-blue-600 transition-colors">
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
      <main className="p-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          Meus Chamados
        </h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {chamados.length === 0 ? (
            <p className="text-gray-600">
              Você ainda não abriu nenhum chamado.
            </p>
          ) : (
            <ul className="space-y-4">
              {chamados.map((chamado) => (
                <li key={chamado.id} className="border-b last:border-b-0 py-3">
                  <Link
                    to={`/chamado/${chamado.id}`}
                    className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-md"
                  >
                    <div>
                      <p className="font-semibold text-lg text-gray-800">
                        {chamado.titulo}
                      </p>
                      <p className="text-sm text-gray-600">
                        {chamado.descricao.substring(0, 100)}...
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium text-white px-3 py-1 rounded-full ${
                        chamado.status === "aberto"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {chamado.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
