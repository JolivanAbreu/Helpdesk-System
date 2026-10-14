// src/config/database.js
require('dotenv').config({ quiet: true });

module.exports = {
    dialect: 'mariadb',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Mostra cada SQL executado no terminal só se DB_LOGGING=true
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true,
    },
};