// src/components/AdminRoute.jsx
import React from "react";
import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { usuarioLogado } from "../services/api";

// Esconde as telas de administração de quem não é admin.
// É só conveniência de navegação: a proteção de verdade está na API,
// que responde 403 para qualquer rota de admin chamada por outro perfil.
export default function AdminRoute() {
  const user = usuarioLogado();
  // Repassa o contexto do layout (usuário, ações) para as páginas de admin
  const contexto = useOutletContext();

  if (user?.perfil !== "admin") {
    return <Navigate to="/chamados" replace />;
  }

  return <Outlet context={contexto} />;
}
