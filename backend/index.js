// backend/index.js

const express = require('express');
const path = require('path');
const cors = require('cors'); 
require('dotenv').config({ quiet: true });
require('./src/database');

const routes = require('./src/routes');

const app = express();

app.use(express.json());
app.use(cors()); 

app.use(
  '/files',
  express.static(path.resolve(__dirname, 'tmp', 'uploads'))
);

app.use('/api', routes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});