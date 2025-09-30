// src/routes.js
const express = require('express');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/auth');

const routes = express.Router();

// Rotas de Autenticação
routes.post('/register', authController.register);
routes.post('/login', authController.login);

// Rota protegida para teste
routes.get('/dashboard', authMiddleware, (req, res) => {
    res.send({ ok: true, user: req.userId });
});

module.exports = routes;