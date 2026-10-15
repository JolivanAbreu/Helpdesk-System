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

export const PERFIS = {
  comum: { rotulo: "Colaborador", descricao: "Abre e acompanha os próprios chamados" },
  suporte: { rotulo: "Suporte", descricao: "Atende todos os chamados" },
  admin: { rotulo: "Administrador", descricao: "Atende chamados e administra o sistema" },
};
export const LISTA_PERFIS = Object.keys(PERFIS);

export const CATEGORIAS = {
  hardware: { rotulo: "Hardware", icone: Cpu, exemplo: "Computador, impressora, monitor, periféricos" },
  software: { rotulo: "Software e sistemas", icone: AppWindow, exemplo: "Programas, sistemas internos, licenças" },
  rede: { rotulo: "Rede e internet", icone: Wifi, exemplo: "Internet, VPN, Wi-Fi, telefone" },
  acessos: { rotulo: "Acessos e senhas", icone: KeyRound, exemplo: "Senha, permissões, novo usuário" },
  email: { rotulo: "E-mail", icone: Mail, exemplo: "Caixa de entrada, Outlook, envio" },
  outros: { rotulo: "Outros", icone: Shapes, exemplo: "Qualquer outro assunto" },
};
export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS);

// Situação de um prazo de SLA (resposta ou solução)
export const SITUACOES_SLA = {
  no_prazo: { rotulo: "No prazo", tom: "neutro" },
  em_risco: { rotulo: "Em risco", tom: "alerta" },
  estourado: { rotulo: "Atrasado", tom: "perigo" },
  cumprido: { rotulo: "Cumprido", tom: "sucesso" },
  violado: { rotulo: "Fora do prazo", tom: "falha" },
};
