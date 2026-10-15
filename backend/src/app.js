// src/app.js
// Monta o app Express sem abrir porta. O index.js sobe o servidor;
// os testes usam o app diretamente com o Supertest.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./database');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Necessário para o rate limit identificar o IP real atrás de proxy (ex.: Railway)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Permite ao frontend ler o nome do arquivo no download de anexos
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '100kb' }));

app.use('/api', routes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use(errorHandler);

module.exports = app;
