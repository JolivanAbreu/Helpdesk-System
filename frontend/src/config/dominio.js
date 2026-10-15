// src/config/dominio.js
// Rótulos e cores de status, prioridades e perfis usados em toda a interface.
import {
  Circle, CircleDot, CircleCheck, Cpu, AppWindow, Wifi, KeyRound, Mail, Shapes,
} from "lucide-react";

export const STATUS = {
  aberto: { rotulo: "Aberto", icone: Circle, classe: "bg-azul-claro text-azul-escuro" },
  "em andamento": { rotulo: "Em andamento", icone: CircleDot, classe: "bg-amber-50 text-amber-800" },
  resolvido: { rotulo: "Resolvido", icone: CircleCheck, classe: "bg-emerald-50 text-emerald-800" },
};
export const LISTA_STATUS = Object.keys(STATUS);

// Da mais urgente para a menos urgente
export const PRIORIDADES = {
  critica: { rotulo: "Crítica", cor: "bg-prioridade-critica", texto: "text-prioridade-critica" },
  alta: { rotulo: "Alta", cor: "bg-prioridade-alta", texto: "text-prioridade-alta" },
  media: { rotulo: "Média", cor: "bg-prioridade-media", texto: "text-amber-800" },
  baixa: { rotulo: "Baixa", cor: "bg-prioridade-baixa", texto: "text-aco" },
};
export const LISTA_PRIORIDADES = Object.keys(PRIORIDADES);

// Metas de atendimento por prioridade, em horas (iguais às do backend).
// São o ponto de partida ao criar uma subcategoria no catálogo.
export const METAS_SLA = {
  critica: { resposta: 1, solucao: 4 },
  alta: { resposta: 2, solucao: 8 },
  media: { resposta: 4, solucao: 24 },
  baixa: { resposta: 8, solucao: 72 },
};

export const PERFIS = {
  comum: { rotulo: "Colaborador", descricao: "Abre e acompanha os próprios chamados" },
  suporte: { rotulo: "Suporte", descricao: "Atende todos os chamados" },
  admin: { rotulo: "Administrador", descricao: "Atende chamados e administra o sistema" },
};
export const LISTA_PERFIS = Object.keys(PERFIS);

// Ícones das categorias principais do catálogo (o campo "icone" da API)
export const ICONES_CATEGORIA = {
  hardware: { rotulo: "Hardware", icone: Cpu },
  software: { rotulo: "Software", icone: AppWindow },
  rede: { rotulo: "Rede", icone: Wifi },
  acessos: { rotulo: "Acessos", icone: KeyRound },
  email: { rotulo: "E-mail", icone: Mail },
  outros: { rotulo: "Outros", icone: Shapes },
};
export const LISTA_ICONES = Object.keys(ICONES_CATEGORIA);
export const iconeCategoria = (chave) => (ICONES_CATEGORIA[chave] || ICONES_CATEGORIA.outros).icone;

// Situação de um prazo de SLA (resposta ou solução)
export const SITUACOES_SLA = {
  no_prazo: { rotulo: "No prazo", tom: "neutro" },
  em_risco: { rotulo: "Em risco", tom: "alerta" },
  estourado: { rotulo: "Atrasado", tom: "perigo" },
  cumprido: { rotulo: "Cumprido", tom: "sucesso" },
  violado: { rotulo: "Fora do prazo", tom: "falha" },
};
