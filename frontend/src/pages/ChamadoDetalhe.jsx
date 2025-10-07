// src/pages/ChamadoDetalhe.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

export default function ChamadoDetalhe() {
  const { id } = useParams(); // Pega o ID do chamado da URL
  const navigate = useNavigate();
  const [chamado, setChamado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [novaInteracao, setNovaInteracao] = useState("");
  const user = JSON.parse(localStorage.getItem("@HelpDesk:user"));

  const fetchChamado = async () => {
    try {
      const response = await api.get(`/chamados/${id}`);
      setChamado(response.data);
    } catch (error) {
      toast.error("Erro ao buscar chamado.");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamado();
  }, [id]);

  const handleAddInteracao = async (e) => {
    e.preventDefault();
    if (!novaInteracao.trim()) return;

    const toastId = toast.loading("Adicionando comentário...");
    try {
      await api.post(`/chamados/${id}/interacoes`, { mensagem: novaInteracao });
      setNovaInteracao("");
      fetchChamado(); // Re-busca os dados para atualizar a timeline
      toast.success("Comentário adicionado!", { id: toastId });
    } catch (error) {
      toast.error("Falha ao adicionar comentário.", { id: toastId });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("anexo", file);

    const toastId = toast.loading("Enviando anexo...");
    try {
      await api.post(`/chamados/${id}/anexos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchChamado(); // Atualiza a lista de anexos
      toast.success("Anexo enviado com sucesso!", { id: toastId });
    } catch (error) {
      toast.error("Falha ao enviar anexo.", { id: toastId });
    }
  };

  if (loading || !chamado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Carregando...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">
          Detalhes do Chamado #{chamado.id}
        </h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Voltar
        </button>
      </header>

      <main className="p-8 grid grid-cols-3 gap-8">
        {/* Coluna de Detalhes e Anexos */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-2">Título</h3>
            <p>{chamado.titulo}</p>
            <h3 className="font-bold text-lg mt-4 mb-2">Descrição</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {chamado.descricao}
            </p>
            <h3 className="font-bold text-lg mt-4 mb-2">Status</h3>
            <p className="text-white bg-blue-500 px-3 py-1 rounded-full inline-block">
              {chamado.status}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">Anexos</h3>
            <input type="file" onChange={handleFileUpload} className="mb-4" />
            <ul className="space-y-2">
              {chamado.anexos.map((anexo) => (
                <li key={anexo.id}>
                  <a
                    href={`http://localhost:3000/files/${anexo.nome_arquivo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {anexo.nome_original}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coluna da Timeline de Interações */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Timeline de Interações
          </h2>
          <div className="space-y-4 mb-6">
            {chamado.interacoes.map((interacao) => (
              <div
                key={interacao.id}
                className={`p-4 rounded-lg ${
                  interacao.usuario_id === user.id
                    ? "bg-blue-100"
                    : "bg-gray-100"
                }`}
              >
                <p className="font-semibold">
                  {interacao.usuario.nome}{" "}
                  <span className="text-sm text-gray-500 font-normal">
                    - {new Date(interacao.created_at).toLocaleString("pt-BR")}
                  </span>
                </p>
                <p className="text-gray-800 mt-1">{interacao.mensagem}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddInteracao}>
            <textarea
              value={novaInteracao}
              onChange={(e) => setNovaInteracao(e.target.value)}
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Digite seu comentário..."
            ></textarea>
            <button
              type="submit"
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              Enviar Comentário
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
