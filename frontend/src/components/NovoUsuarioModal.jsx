// src/components/NovoUsuarioModal.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";
import { PERFIS, LISTA_PERFIS } from "../config/dominio";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Campo, { Input, Select } from "./ui/Campo";

export default function NovoUsuarioModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "suporte" });
  const [enviando, setEnviando] = useState(false);

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const { data } = await api.post("/usuarios", form);
      toast.success(`${data.nome} cadastrado como ${PERFIS[data.perfil].rotulo.toLowerCase()}.`);
      onCriado(data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível criar o usuário."));
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Novo usuário"
      descricao="Passe a senha inicial para a pessoa por um canal seguro."
      onFechar={onFechar}
      largura="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Campo rotulo="Nome completo">
          {(p) => <Input {...p} name="nome" value={form.nome} onChange={alterar} minLength={2} required />}
        </Campo>
        <Campo rotulo="E-mail">
          {(p) => <Input {...p} name="email" type="email" value={form.email} onChange={alterar} required />}
        </Campo>
        <Campo rotulo="Senha inicial" ajuda="Mínimo de 6 caracteres.">
          {(p) => (
            <Input {...p} name="senha" type="password" value={form.senha} onChange={alterar}
              minLength={6} autoComplete="new-password" required />
          )}
        </Campo>
        <Campo rotulo="Perfil" ajuda={PERFIS[form.perfil].descricao}>
          {(p) => (
            <Select {...p} name="perfil" value={form.perfil} onChange={alterar}>
              {LISTA_PERFIS.map((perfil) => (
                <option key={perfil} value={perfil}>{PERFIS[perfil].rotulo}</option>
              ))}
            </Select>
          )}
        </Campo>
        <div className="flex justify-end gap-3 pt-2">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando}>Criar usuário</Button>
        </div>
      </form>
    </Modal>
  );
}
