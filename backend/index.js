// backend/index.js
const express = require('express');
require('dotenv').config();

// Importamos a conexão em vez de só o index do database
const connection = require('./src/database'); 
const routes = require('./src/routes');

const app = express();

app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3000;

// Adicionamos a sincronização antes de iniciar o servidor
connection.sync({ force: false }).then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}).catch((error) => {
  console.error('Não foi possível sincronizar com o banco de dados:', error);
});