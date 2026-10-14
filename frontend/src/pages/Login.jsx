// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { TOKEN_KEY, USER_KEY, AVISO_KEY, mensagemDeErro } from "../services/api";
import AuthLayout from "../components/layout/AuthLayout";
import Campo, { Input } from "../components/ui/Campo";
import Button from "../components/ui/Button";
import CampoSenha from "../components/CampoSenha";

// Contas do seed, exibidas só quando VITE_MODO_DEMO=true (útil em portfólio)
const CONTAS_DEMO = [
  { perfil: "Colaborador", email: "usuario@helpdesk.com" },
  { perfil: "Suporte", email: "suporte@helpdesk.com" },
  { perfil: "Administrador", email: "admin@helpdesk.com" },
];
const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === "true";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  // Mostra o motivo de a sessão ter sido encerrada (token expirado, conta desativada...)
  useEffect(() => {
    const aviso = sessionStorage.getItem(AVISO_KEY);
    if (aviso) {
      sessionStorage.removeItem(AVISO_KEY);
      toast.error(aviso, { id: "aviso-sessao" });
    }
  }, []);

  async function entrar(credenciais) {
    setEnviando(true);
    try {
      const { data } = await api.post("/login", credenciais);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
      navigate("/chamados");
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível entrar."));
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
      <p className="mt-1 text-sm text-aco">Use o e-mail e a senha da sua conta.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); entrar({ email, senha }); }}
        className="mt-8 space-y-4"
      >
        <Campo rotulo="E-mail">
          {(p) => (
            <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required />
          )}
        </Campo>
        <Campo rotulo="Senha">
          {(p) => (
            <CampoSenha {...p} value={senha} onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password" required />
          )}
        </Campo>
        <Button type="submit" carregando={enviando} className="w-full justify-center">Entrar</Button>
      </form>

      <p className="mt-6 text-sm text-aco">
        Ainda não tem conta?{" "}
        <Link to="/register" className="font-medium text-azul hover:underline">Criar conta</Link>
      </p>

      {MODO_DEMO && (
        <div className="mt-10 rounded-md border border-borda p-4">
          <p className="text-sm font-medium">Contas de demonstração</p>
          <p className="mt-0.5 text-xs text-aco">Senha de todas: 123456. Clique para entrar.</p>
          <div className="mt-3 grid gap-2">
            {CONTAS_DEMO.map((conta) => (
              <button
                key={conta.email}
                type="button"
                disabled={enviando}
                onClick={() => entrar({ email: conta.email, senha: "123456" })}
                className="flex items-center justify-between rounded-md bg-nevoa px-3 py-2 text-left text-sm hover:bg-azul-claro disabled:opacity-60"
              >
                <span className="font-medium">{conta.perfil}</span>
                <span className="text-xs text-aco">{conta.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
