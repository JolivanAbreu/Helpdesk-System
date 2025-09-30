// src/database/index.js (Esta estrutura será útil quando tivermos mais modelos)
const Sequelize = require('sequelize');
const dbConfig = require('../config/database');

const Usuario = require('../models/Usuario');

const connection = new Sequelize(dbConfig);

Usuario.init(connection);

module.exports = connection;