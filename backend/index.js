// backend/index.js
require('dotenv').config({ quiet: true });

if (!process.env.JWT_SECRET) {
  console.error('ERRO: defina JWT_SECRET no arquivo backend/.env (veja o .env.example).');
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
