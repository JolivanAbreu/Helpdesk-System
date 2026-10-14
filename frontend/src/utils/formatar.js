// src/utils/formatar.js
import { PREFIXO_CHAMADO } from "../config/marca";

// 42 -> "CH-0042"
export function codigoChamado(id) {
  return `${PREFIXO_CHAMADO}-${String(id).padStart(4, "0")}`;
}

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

// "agora", "há 5 minutos", "ontem", "há 3 dias"...
export function tempoRelativo(data) {
  const segundos = Math.round((new Date(data) - Date.now()) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 45) return "agora";
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(segundos / 3600), "hour");
  if (abs < 86400 * 30) return relativo.format(Math.round(segundos / 86400), "day");
  return dataCurta(data);
}

export function dataCurta(data) {
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function dataHora(data) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// 26.5 -> "1 dia e 2 h" | 3.2 -> "3,2 h"
export function duracaoHoras(horas) {
  if (horas === null || horas === undefined) return "sem dados";
  if (horas < 24) return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas % 24);
  return `${dias} dia${dias > 1 ? "s" : ""}${resto ? ` e ${resto} h` : ""}`;
}

export function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
