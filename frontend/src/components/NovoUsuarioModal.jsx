// src/components/NovoUsuarioModal.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";

const campo =
  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NovoUsuarioModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "suporte" });
  const [enviando, setEnviando] = useState(false);

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const { data } = await api.post("/usuarios", form);
      toast.success(`${data.nome} cadastrado como ${data.perfil}.`);
      onCriado(data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível criar o usuário."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-usuario-titulo"
      >
        <h2 id="novo-usuario-titulo" className="text-xl font-bold text-gray-800 mb-1">
          Novo usuário
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Informe a senha inicial ao usuário por um canal seguro.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nu-nome" className="block text-gray-700 mb-1">Nome</label>
            <input id="nu-nome" name="nome" value={form.nome} onChange={alterar}
              className={campo} minLength={2} required autoFocus />
          </div>
          <div>
            <label htmlFor="nu-email" className="block text-gray-700 mb-1">E-mail</label>
            <input id="nu-email" name="email" type="email" value={form.email} onChange={alterar}
              className={campo} required />
          </div>
          <div>
            <label htmlFor="nu-senha" className="block text-gray-700 mb-1">Senha inicial</label>
            <input id="nu-senha" name="senha" type="password" value={form.senha} onChange={alterar}
              className={campo} minLength={6} autoComplete="new-password" required />
          </div>
          <div>
            <label htmlFor="nu-perfil" className="block text-gray-700 mb-1">Perfil</label>
            <select id="nu-perfil" name="perfil" value={form.perfil} onChange={alterar} className={campo}>
              <option value="comum">Comum: abre e acompanha os próprios chamados</option>
              <option value="suporte">Suporte: atende todos os chamados</option>
              <option value="admin">Admin: suporte + administração</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onFechar} className="px-4 py-2 rounded-md border hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-60"
            >
              {enviando ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
