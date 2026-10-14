// src/services/api.js
import axios from 'axios';

export const TOKEN_KEY = '@HelpDesk:token';
export const USER_KEY = '@HelpDesk:user';

const api = axios.create({
    // Definido em frontend/.env (veja o .env.example). Em produção,
    // aponta para a URL pública do backend.
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

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
