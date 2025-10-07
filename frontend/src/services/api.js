// src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // A URL base do seu backend
});

// Este interceptor adiciona o token de autenticação em todas as chamadas para a API
api.interceptors.request.use(async config => {
    const token = localStorage.getItem('@HelpDesk:token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;