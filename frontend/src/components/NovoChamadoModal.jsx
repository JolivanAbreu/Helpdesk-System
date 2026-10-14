// src/components/NovoChamadoModal.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";
import { codigoChamado } from "../utils/formatar";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Campo, { Input, Textarea } from "./ui/Campo";
import { PrioridadeSelo } from "./ui/Selos";

// A prioridade é explicada do ponto de vista de quem pede ajuda
const OPCOES_PRIORIDADE = [
  { valor: "baixa", texto: "Pode esperar, não atrapalha o trabalho" },
  { valor: "media", texto: "Atrapalha, mas consigo trabalhar" },
  { valor: "alta", texto: "Impede o meu trabalho" },
  { valor: "critica", texto: "Afeta um setor ou a empresa inteira" },
];

export default function NovoChamadoModal({ onFechar, onCriado }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const { data } = await api.post("/chamados", { titulo, descricao, prioridade });
      toast.success(`Chamado ${codigoChamado(data.id)} aberto.`);
      onCriado(data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível abrir o chamado."));
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Novo chamado"
      descricao="Descreva o problema. A equipe de suporte é avisada pela fila de atendimento."
      onFechar={onFechar}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Campo rotulo="Assunto">
          {(p) => (
            <Input
              {...p}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Impressora do financeiro não imprime"
              minLength={3}
              maxLength={255}
              required
            />
          )}
        </Campo>

        <Campo rotulo="Descrição" ajuda="Inclua quando começou, o que aparece na tela e o que você já tentou.">
          {(p) => (
            <Textarea
              {...p}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              required
            />
          )}
        </Campo>

        <fieldset>
          <legend className="block text-sm font-medium text-marinho mb-1.5">Quanto isso afeta você?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPCOES_PRIORIDADE.map((opcao) => (
              <label
                key={opcao.valor}
                className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
                  prioridade === opcao.valor
                    ? "border-azul bg-azul-claro/60 ring-1 ring-azul"
                    : "border-borda hover:border-aco/50"
                }`}
              >
                <input
                  type="radio"
                  name="prioridade"
                  value={opcao.valor}
                  checked={prioridade === opcao.valor}
                  onChange={() => setPrioridade(opcao.valor)}
                  className="sr-only"
                />
                <PrioridadeSelo prioridade={opcao.valor} />
                <span className="text-xs text-aco">{opcao.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 pt-1">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando}>Abrir chamado</Button>
        </div>
      </form>
    </Modal>
  );
}
