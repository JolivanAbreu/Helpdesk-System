// src/components/NovoUsuarioModal.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";
import { PERFIS, LISTA_PERFIS } from "../config/dominio";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Campo, { Input, Select } from "./ui/Campo";

export default function NovoUsuarioModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", perfil: "suporte", setor: "", cargo: "", ramal: "", localizacao: "",
  });
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
      largura="max-w-lg"
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
        <CamposFuncionario form={form} onMudar={alterar} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando}>Criar usuário</Button>
        </div>
      </form>
    </Modal>
  );
}

// Setor, cargo, ramal e localização: preenchem automaticamente o formulário
// de abertura de chamado. Usado na criação e na edição de usuários.
export function CamposFuncionario({ form, onMudar }) {
  return (
    <fieldset className="grid gap-4 border-t border-borda pt-4 sm:grid-cols-2">
      <legend className="sr-only">Dados do funcionário</legend>
      <Campo rotulo="Setor">
        {(p) => <Input {...p} name="setor" value={form.setor ?? ""} onChange={onMudar} maxLength={80} placeholder="Ex.: Financeiro" />}
      </Campo>
      <Campo rotulo="Cargo">
        {(p) => <Input {...p} name="cargo" value={form.cargo ?? ""} onChange={onMudar} maxLength={80} />}
      </Campo>
      <Campo rotulo="Ramal ou telefone">
        {(p) => <Input {...p} name="ramal" value={form.ramal ?? ""} onChange={onMudar} maxLength={30} />}
      </Campo>
      <Campo rotulo="Localização">
        {(p) => <Input {...p} name="localizacao" value={form.localizacao ?? ""} onChange={onMudar} maxLength={120} placeholder="Ex.: Sede · 2º andar" />}
      </Campo>
    </fieldset>
  );
}

// Edição dos dados do funcionário pelo admin
export function DadosFuncionarioModal({ usuario, onFechar, onSalvo }) {
  const [form, setForm] = useState({
    setor: usuario.setor ?? "", cargo: usuario.cargo ?? "", ramal: usuario.ramal ?? "", localizacao: usuario.localizacao ?? "",
  });
  const [enviando, setEnviando] = useState(false);
  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}`, form);
      toast.success(`Dados de ${data.nome} atualizados.`);
      onSalvo(data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível salvar."));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Dados de ${usuario.nome}`} descricao="Usados para preencher automaticamente os chamados." onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CamposFuncionario form={form} onMudar={alterar} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
