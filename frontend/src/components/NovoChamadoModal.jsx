// src/components/NovoChamadoModal.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";

export default function NovoChamadoModal({ onFechar, onCriado }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      const response = await api.post("/chamados", { titulo, descricao });
      toast.success(`Chamado #${response.data.id} aberto!`);
      onCriado(response.data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível abrir o chamado."));
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
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-chamado-titulo"
      >
        <h2 id="novo-chamado-titulo" className="text-xl font-bold text-gray-800 mb-4">
          Abrir novo chamado
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="titulo" className="block text-gray-700 mb-1">
              Título
            </label>
            <input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Impressora não imprime"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={3}
              maxLength={255}
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="descricao" className="block text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema, quando começou e o que já tentou."
              rows={5}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-md border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-60"
            >
              {enviando ? "Abrindo..." : "Abrir chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
