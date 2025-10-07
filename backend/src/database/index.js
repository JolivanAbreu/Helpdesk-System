// src/database/index.js
const Sequelize = require('sequelize');
const dbConfig = require('../config/database');

const Usuario = require('../models/Usuario');
const Chamado = require('../models/Chamado');
const Interacao = require('../models/Interacao');
const Anexo = require('../models/Anexo');

const connection = new Sequelize(dbConfig);

// Inicializa os modelos
Usuario.init(connection);
Chamado.init(connection);
Interacao.init(connection);
Anexo.init(connection);

// Executa as associações
Usuario.associate(connection.models);
Chamado.associate(connection.models);
Interacao.associate(connection.models);
Anexo.associate(connection.models);

module.exports = connection;