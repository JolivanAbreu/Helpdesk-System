// src/components/AppHeader.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api, { TOKEN_KEY, USER_KEY, usuarioLogado } from "../services/api";

const linkClasse = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

// Cabeçalho comum às páginas logadas. Ao montar, busca /me para manter
// nome e perfil atualizados (ex.: se o admin mudou o perfil do usuário).
export default function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(usuarioLogado());

  useEffect(() => {
    api
      .get("/me")
      .then(({ data }) => {
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        setUser(data);
      })
      .catch(() => {}); // 401 já é tratado pelo interceptor da API
  }, []);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/");
  }

  return (
    <header className="bg-white shadow px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-lg font-bold text-gray-800 leading-tight">Helpdesk</p>
          <p className="text-xs text-gray-500">
            {user?.nome} · {user?.perfil}
          </p>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/dashboard" className={linkClasse}>
            Chamados
          </NavLink>
          {user?.perfil === "admin" && (
            <NavLink to="/admin" className={linkClasse}>
              Administração
            </NavLink>
          )}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-red-600 border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
      >
        Sair
      </button>
    </header>
  );
}
