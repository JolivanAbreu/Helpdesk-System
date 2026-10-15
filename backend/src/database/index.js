// backend/src/database/index.js
const Sequelize = require('sequelize');
const dbConfig = require('../config/database');

const Usuario = require('../models/Usuario');
const Chamado = require('../models/Chamado');
const Interacao = require('../models/Interacao');
const Anexo = require('../models/Anexo');
const Grupo = require('../models/Grupo');
const Categoria = require('../models/Categoria');

const connection = new Sequelize(dbConfig);

Usuario.init(connection);
Chamado.init(connection);
Interacao.init(connection);
Anexo.init(connection);
Grupo.init(connection);
Categoria.init(connection);

Usuario.associate(connection.models);
Chamado.associate(connection.models);
Interacao.associate(connection.models);
Anexo.associate(connection.models);
Grupo.associate(connection.models);
Categoria.associate(connection.models);

module.exports = connection;