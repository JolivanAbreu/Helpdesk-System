// src/components/layout/AppLayout.jsx
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Inbox, UserCheck, ShieldCheck, LogOut, Menu, Plus, X } from "lucide-react";
import api, { TOKEN_KEY, USER_KEY, DEMO_LOCAL, usuarioLogado, isEquipe } from "../../services/api";
import { PERFIS } from "../../config/dominio";
import Logo from "../ui/Logo";
import Button from "../ui/Button";
import { Avatar, Contador } from "../ui/Selos";
import NovoChamadoModal from "../NovoChamadoModal";
import AvisoDemo from "../AvisoDemo";

// Estrutura das páginas logadas: barra lateral + conteúdo.
// As páginas recebem { user, abrirNovoChamado, atualizarContadores } via useOutletContext().
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(usuarioLogado());
  const [contadores, setContadores] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const equipe = isEquipe(user);

  // Mantém nome e perfil atualizados (ex.: o admin mudou o perfil do usuário)
  useEffect(() => {
    api.get("/me").then(({ data }) => {
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      setUser(data);
    }).catch(() => {});
  }, []);

  const atualizarContadores = useCallback(() => {
    api.get("/chamados", { params: { porPagina: 1 } })
      .then(({ data }) => setContadores(data.contadores))
      .catch(() => {});
  }, []);

  // Recalcula os contadores e fecha o menu do celular a cada navegação
  useEffect(() => {
    atualizarContadores();
    setMenuAberto(false);
  }, [location.pathname, atualizarContadores]);

  // Atalho: tecla N abre um novo chamado (fora de campos de texto)
  useEffect(() => {
    function aoTeclar(e) {
      const digitando = e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key.toLowerCase() === "n" && !digitando && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setNovoAberto(true);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  function sair() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/");
  }

  const barraLateral = (
    <BarraLateral
      user={user}
      equipe={equipe}
      contadores={contadores}
      onNovo={() => setNovoAberto(true)}
      onSair={sair}
    />
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop: barra lateral fixa */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-marinho">{barraLateral}</aside>

      {/* Celular: barra superior + menu deslizante */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-marinho px-4 h-14">
        <Logo claro />
        <button
          onClick={() => setMenuAberto(true)}
          className="p-2 -mr-2 text-white/80 hover:text-white rounded-md"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {menuAberto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-marinho/50" onClick={() => setMenuAberto(false)}>
          <aside
            className="relative flex h-full w-72 max-w-[85%] flex-col bg-marinho animate-deslizar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuAberto(false)}
              className="absolute right-3 top-4 p-2 text-white/70 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {barraLateral}
          </aside>
        </div>
      )}

      {DEMO_LOCAL && <AvisoDemo />}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <Outlet context={{ user, abrirNovoChamado: () => setNovoAberto(true), atualizarContadores }} />
      </main>

      {novoAberto && (
        <NovoChamadoModal
          onFechar={() => setNovoAberto(false)}
          onCriado={(chamado) => {
            setNovoAberto(false);
            atualizarContadores();
            navigate(`/chamado/${chamado.id}`);
          }}
        />
      )}
    </div>
  );
}

const itemClasse = ({ isActive }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
  }`;

function BarraLateral({ user, equipe, contadores, onNovo, onSair }) {
  const location = useLocation();
  // "Atribuídos a mim" é uma aba da lista; o item fica ativo quando a aba está aberta
  const naAbaMinha = location.pathname === "/chamados" && location.search.includes("aba=meus");

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Logo claro className="px-2" />

      <Button onClick={onNovo} icone={Plus} className="mt-6 w-full justify-center" title="Atalho: tecla N">
        Novo chamado
      </Button>

      <nav className="mt-6 space-y-1" aria-label="Principal">
        <NavLink to="/chamados" end className={(p) => itemClasse({ isActive: p.isActive && !naAbaMinha })}>
          <Inbox className="h-4 w-4" aria-hidden="true" />
          <span className="flex-1">{equipe ? "Fila de chamados" : "Meus chamados"}</span>
          {contadores && <Contador valor={contadores.pendentes} />}
        </NavLink>
        {equipe && (
          <NavLink to="/chamados?aba=meus" className={() => itemClasse({ isActive: naAbaMinha })}>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Atribuídos a mim</span>
            {contadores && <Contador valor={contadores.atribuidosAMim} />}
          </NavLink>
        )}
        {user?.perfil === "admin" && (
          <NavLink to="/admin" className={itemClasse}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Administração</span>
          </NavLink>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4 px-1">
        <Avatar nome={user?.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.nome}</p>
          <p className="truncate text-xs text-white/60">{PERFIS[user?.perfil]?.rotulo}</p>
        </div>
        <button
          onClick={onSair}
          className="rounded-md p-2 text-white/60 hover:bg-white/5 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
