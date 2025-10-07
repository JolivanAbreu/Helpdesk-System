// backend/index.js

const express = require('express');
const path = require('path');
require('dotenv').config();
require('./src/database');

const routes = require('./src/routes');

const app = express();

app.use(express.json());

app.use(
  '/files',
  express.static(path.resolve(__dirname, 'tmp', 'uploads'))
);

app.use('/api', routes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});