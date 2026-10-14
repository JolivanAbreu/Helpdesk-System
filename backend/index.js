// backend/index.js
require('dotenv').config({ quiet: true });

if (!process.env.JWT_SECRET) {
  console.error('ERRO: defina JWT_SECRET no arquivo backend/.env (veja o .env.example).');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./src/database');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
