// src/pages/ChamadoDetalhe.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { usuarioLogado, isEquipe, mensagemDeErro } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import AppHeader from "../components/AppHeader";

const STATUS = ["aberto", "em andamento", "resolvido"];

export default function ChamadoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chamado, setChamado] = useState(null);
  const [novaInteracao, setNovaInteracao] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const user = usuarioLogado();
  const equipe = isEquipe(user);

  const fetchChamado = async () => {
    try {
      const response = await api.get(`/chamados/${id}`);
      setChamado(response.data);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Erro ao buscar chamado."));
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    fetchChamado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddInteracao = async (e) => {
    e.preventDefault();
    if (!novaInteracao.trim()) return;

    setEnviandoComentario(true);
    try {
      await api.post(`/chamados/${id}/interacoes`, { mensagem: novaInteracao });
      setNovaInteracao("");
      await fetchChamado();
    } catch (error) {
      toast.error(mensagemDeErro(error, "Falha ao adicionar comentário."));
    } finally {
      setEnviandoComentario(false);
    }
  };

  const handleFileUpload = async (event) => {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("anexo", file);

    const toastId = toast.loading("Enviando anexo...");
    try {
      await api.post(`/chamados/${id}/anexos`, formData);
      await fetchChamado();
      toast.success("Anexo enviado!", { id: toastId });
    } catch (error) {
      toast.error(mensagemDeErro(error, "Falha ao enviar anexo."), { id: toastId });
    } finally {
      input.value = ""; // permite reenviar o mesmo arquivo
    }
  };

  // Os anexos exigem token, então são baixados pela API (com o
  // cabeçalho Authorization) e entregues ao navegador como arquivo.
  const handleDownload = async (anexo) => {
    try {
      const response = await api.get(`/chamados/${id}/anexos/${anexo.id}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = anexo.nome_original;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Libera a memória depois que o navegador iniciou o download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Não foi possível baixar o anexo.");
    }
  };

  const handleStatus = async (status) => {
    try {
      const response = await api.put(`/chamados/${id}/status`, { status });
      setChamado((atual) => ({ ...atual, status: response.data.status }));
      toast.success(`Status alterado para "${status}".`);
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível alterar o status."));
    }
  };

  if (!chamado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader />
      <div className="px-4 sm:px-8 pt-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Chamado #{chamado.id}</h1>
      </div>

      <main className="p-4 sm:p-8 pt-4 sm:pt-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna de detalhes, status e anexos */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-2">Título</h3>
            <p>{chamado.titulo}</p>

            <h3 className="font-bold text-lg mt-4 mb-2">Descrição</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{chamado.descricao}</p>

            <h3 className="font-bold text-lg mt-4 mb-2">Aberto por</h3>
            <p className="text-gray-700">
              {chamado.usuario?.nome ?? "Usuário removido"}
              <span className="block text-sm text-gray-500">
                {new Date(chamado.createdAt).toLocaleString("pt-BR")}
              </span>
            </p>

            <h3 className="font-bold text-lg mt-4 mb-2">Status</h3>
            <StatusBadge status={chamado.status} />

            {/* Equipe pode definir qualquer status; o dono só encerra ou reabre */}
            <div className="mt-4 flex flex-wrap gap-2">
              {equipe
                ? STATUS.filter((s) => s !== chamado.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(s)}
                      className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50"
                    >
                      Marcar como {s}
                    </button>
                  ))
                : chamado.status === "resolvido"
                ? (
                    <button
                      onClick={() => handleStatus("aberto")}
                      className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50"
                    >
                      Reabrir chamado
                    </button>
                  )
                : (
                    <button
                      onClick={() => handleStatus("resolvido")}
                      className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50"
                    >
                      Marcar como resolvido
                    </button>
                  )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">Anexos</h3>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,application/pdf"
              onChange={handleFileUpload}
              className="mb-1 text-sm"
            />
            <p className="text-xs text-gray-500 mb-4">Imagens ou PDF, até 10 MB.</p>
            {chamado.anexos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum anexo.</p>
            ) : (
              <ul className="space-y-2">
                {chamado.anexos.map((anexo) => (
                  <li key={anexo.id}>
                    <button
                      onClick={() => handleDownload(anexo)}
                      className="text-blue-600 hover:underline text-left break-all"
                    >
                      {anexo.nome_original}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Coluna da timeline de interações */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Timeline de Interações
          </h2>
          <div className="space-y-4 mb-6">
            {chamado.interacoes.length === 0 && (
              <p className="text-gray-500">Nenhuma interação ainda.</p>
            )}
            {chamado.interacoes.map((interacao) => (
              <div
                key={interacao.id}
                className={`p-4 rounded-lg ${
                  interacao.usuario_id === user?.id ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                <p className="font-semibold">
                  {interacao.usuario?.nome ?? "Usuário removido"}
                  {isEquipe(interacao.usuario) && (
                    <span className="ml-2 text-xs font-medium bg-gray-700 text-white px-2 py-0.5 rounded">
                      {interacao.usuario.perfil}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 font-normal">
                    {" "}- {new Date(interacao.createdAt).toLocaleString("pt-BR")}
                  </span>
                </p>
                <p className="text-gray-800 mt-1 whitespace-pre-wrap">{interacao.mensagem}</p>
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
              disabled={enviandoComentario || !novaInteracao.trim()}
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-60"
            >
              {enviandoComentario ? "Enviando..." : "Enviar Comentário"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
