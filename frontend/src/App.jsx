// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chamados from "./pages/Chamados";
import ChamadoDetalhe from "./pages/ChamadoDetalhe";
import CentralServicos from "./pages/CentralServicos";
import AbrirChamado from "./pages/AbrirChamado";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/layout/AppLayout";
import { Esqueleto } from "./components/ui/Estados";

// A administração (com os gráficos) só é baixada por quem a abre
const Admin = lazy(() => import("./pages/Admin"));

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "!text-sm !font-sans !text-marinho !shadow-flutuante !rounded-md",
          duration: 3500,
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas que exigem login, dentro do layout com barra lateral */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/abrir" element={<CentralServicos />} />
              <Route path="/abrir/:subcategoriaId" element={<AbrirChamado />} />
              <Route path="/chamados" element={<Chamados />} />
              <Route path="/chamado/:id" element={<ChamadoDetalhe />} />
              <Route element={<AdminRoute />}>
                <Route
                  path="/admin"
                  element={<Suspense fallback={<Esqueleto className="h-96 rounded-lg" />}><Admin /></Suspense>}
                />
              </Route>
            </Route>
          </Route>

          {/* Endereço antigo da lista */}
          <Route path="/dashboard" element={<Navigate to="/chamados" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
