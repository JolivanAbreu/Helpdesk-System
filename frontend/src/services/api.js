// src/services/api.js
import axios from 'axios';

export const TOKEN_KEY = '@HelpDesk:token';
export const USER_KEY = '@HelpDesk:user';
export const AVISO_KEY = '@HelpDesk:aviso';

// Demonstração sem servidor (ex.: publicada na Vercel): as chamadas são
// respondidas por uma API simulada no navegador (src/demo/adaptador.js).
export const DEMO_LOCAL = import.meta.env.VITE_DEMO_LOCAL === 'true';

const api = axios.create({
    // Definido em frontend/.env (veja o .env.example). Em produção,
    // aponta para a URL pública do backend.
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

if (DEMO_LOCAL) {
    // Carregado sob demanda: fora da demo, esse código nem é baixado
    api.defaults.adapter = async (config) => {
        const { default: adaptadorDemo } = await import('../demo/adaptador');
        return adaptadorDemo(config);
    };
}

// Adiciona o token de autenticação em todas as chamadas
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Se o token expirou ou ficou inválido, encerra a sessão e volta ao login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const ehRotaDeLogin = error.config?.url?.includes('/login');
        if (error.response?.status === 401 && !ehRotaDeLogin) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            // Guarda o motivo (ex.: "Conta desativada") para a tela de login exibir
            sessionStorage.setItem(AVISO_KEY, mensagemDeErro(error, 'Sua sessão expirou. Entre novamente.'));
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Extrai a mensagem de erro enviada pela API, com um texto padrão de reserva
export function mensagemDeErro(error, padrao = 'Algo deu errado. Tente novamente.') {
    return error.response?.data?.error || padrao;
}

// Usuário logado salvo no navegador
export function usuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}

export function isEquipe(usuario) {
    return ['suporte', 'admin'].includes(usuario?.perfil);
}

export default api;
