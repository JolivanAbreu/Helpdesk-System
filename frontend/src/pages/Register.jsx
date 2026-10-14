// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { TOKEN_KEY, USER_KEY, mensagemDeErro } from "../services/api";
import AuthLayout from "../components/layout/AuthLayout";
import Campo, { Input } from "../components/ui/Campo";
import Button from "../components/ui/Button";
import CampoSenha from "../components/CampoSenha";

export default function Register() {
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const { data } = await api.post("/register", form);
      // O cadastro já devolve o token, então a pessoa entra direto
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
      toast.success("Conta criada.");
      navigate("/chamados");
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível criar a conta."));
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
      <p className="mt-1 text-sm text-aco">Com a conta você abre chamados e acompanha o atendimento.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Campo rotulo="Nome completo">
          {(p) => <Input {...p} name="nome" value={form.nome} onChange={alterar} autoComplete="name" minLength={2} required />}
        </Campo>
        <Campo rotulo="E-mail corporativo">
          {(p) => <Input {...p} name="email" type="email" value={form.email} onChange={alterar} autoComplete="email" required />}
        </Campo>
        <Campo rotulo="Senha" ajuda="Mínimo de 6 caracteres.">
          {(p) => (
            <CampoSenha {...p} name="senha" value={form.senha} onChange={alterar}
              autoComplete="new-password" minLength={6} required />
          )}
        </Campo>
        <Button type="submit" carregando={enviando} className="w-full justify-center">Criar conta</Button>
      </form>

      <p className="mt-6 text-sm text-aco">
        Já tem conta?{" "}
        <Link to="/" className="font-medium text-azul hover:underline">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
