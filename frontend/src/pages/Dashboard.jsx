// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const [chamados, setChamados] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("@HelpDesk:user"));

  useEffect(() => {
    api.get("/chamados").then((response) => {
      setChamados(response.data);
    });
  }, []);

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard de {user.nome}</h1>
        <div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md mr-4 hover:bg-blue-600">
            Abrir Novo Chamado
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-8">
        <h2 className="text-2xl font-semibold mb-4">Meus Chamados</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {chamados.length === 0 ? (
            <p>Você ainda não abriu nenhum chamado.</p>
          ) : (
            <ul>
              {chamados.map((chamado) => (
                <li
                  key={chamado.id}
                  className="border-b last:border-b-0 py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{chamado.titulo}</p>
                    <p className="text-sm text-gray-600">
                      {chamado.descricao.substring(0, 50)}...
                    </p>
                  </div>
                  <span className="text-sm font-medium text-white bg-green-500 px-3 py-1 rounded-full">
                    {chamado.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
