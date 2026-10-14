// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { TOKEN_KEY } from "../services/api";

const ProtectedRoute = () => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
