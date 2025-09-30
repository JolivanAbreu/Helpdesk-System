// src/config/database.js
require('dotenv').config();

module.exports = {
    dialect: 'mariadb',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    define: {
        timestamps: true, // Cria colunas createdAt e updatedAt
        underscored: true, // Nomes de tabelas e colunas com snake_case
    },
};