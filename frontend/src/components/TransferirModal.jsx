// src/components/TransferirModal.jsx
// Transfere o chamado para outro grupo e/ou técnico, com motivo obrigatório
// (registrado na timeline). É assim que o N1 escala um chamado para o N2.
import React, { useState } from "react";
import toast from "react-hot-toast";
import api, { mensagemDeErro } from "../services/api";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Campo, { Select, Textarea } from "./ui/Campo";

export default function TransferirModal({ chamado, grupos, equipe, onFechar, onTransferido }) {
  const ativos = grupos.filter((g) => g.ativo);
  const [grupoId, setGrupoId] = useState(chamado.grupo_id ?? ativos[0]?.id ?? "");
  const [tecnicoId, setTecnicoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const grupo = ativos.find((g) => g.id === Number(grupoId));
  // Só quem faz parte do grupo escolhido pode receber o chamado
  const tecnicos = equipe.filter((m) => m.grupos?.some((g) => g.id === Number(grupoId)));
  const mudaGrupo = Number(grupoId) !== chamado.grupo_id;
  const mudaTecnico = tecnicoId !== "" && Number(tecnicoId) !== chamado.responsavel_id;
  const algoMuda = mudaGrupo || mudaTecnico;

  function escolherGrupo(valor) {
    setGrupoId(valor);
    setTecnicoId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setEnviando(true);
    try {
      await api.put(`/chamados/${chamado.id}/transferencia`, {
        grupo_id: Number(grupoId),
        ...(tecnicoId ? { responsavel_id: Number(tecnicoId) } : {}),
        motivo,
      });
      const tecnico = tecnicos.find((m) => m.id === Number(tecnicoId));
      toast.success(`Chamado transferido para ${tecnico ? tecnico.nome : grupo.nome}.`);
      onTransferido();
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível transferir o chamado."));
      setEnviando(false);
    }
  }

  let ajudaTecnico = "Sem técnico, o chamado entra na fila do grupo para alguém assumir.";
  if (!mudaGrupo) ajudaTecnico = "Para manter o grupo, escolha outro técnico.";
  if (grupo && !tecnicos.length) ajudaTecnico = "Este grupo ainda não tem membros.";

  return (
    <Modal titulo="Transferir chamado" descricao="Encaminhe para outro grupo ou técnico. O motivo fica registrado no histórico." onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Campo rotulo="Grupo">
          {(p) => (
            <Select {...p} value={grupoId} onChange={(e) => escolherGrupo(e.target.value)} required>
              {!grupo && <option value="" disabled>Escolha o grupo</option>}
              {ativos.map((g) => (
                <option key={g.id} value={g.id}>{g.nome}{g.id === chamado.grupo_id ? " (atual)" : ""}</option>
              ))}
            </Select>
          )}
        </Campo>

        <Campo rotulo="Técnico" ajuda={ajudaTecnico}>
          {(p) => (
            <Select {...p} value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              <option value="">{mudaGrupo ? "Fila do grupo (sem técnico)" : "Manter o atual"}</option>
              {tecnicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}{m.id === chamado.responsavel_id ? " (atual)" : ""}</option>
              ))}
            </Select>
          )}
        </Campo>

        <Campo rotulo="Motivo" ajuda="Ex.: precisa de acesso ao servidor; fora do escopo do N1.">
          {(p) => (
            <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} minLength={3} maxLength={500} required />
          )}
        </Campo>

        <div className="flex justify-end gap-3 pt-1">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" carregando={enviando} disabled={!algoMuda || motivo.trim().length < 3}>Transferir</Button>
        </div>
      </form>
    </Modal>
  );
}
