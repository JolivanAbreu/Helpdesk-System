// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast"; // Importar o Toaster

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ChamadoDetalhe from "./pages/ChamadoDetalhe"; // Página que vamos criar
import ProtectedRoute from "./components/ProtectedRoute"; // Importar a rota protegida
import "./index.css";

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />{" "}
      {/* Componente de Notificação */}
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chamado/:id" element={<ChamadoDetalhe />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
