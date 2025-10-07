// src/routes.js
const express = require('express');
const multer = require('multer');
const multerConfig = require('./config/multer');

const authController = require('./controllers/authController');
const ChamadoController = require('./controllers/ChamadoController');
const AnexoController = require('./controllers/AnexoController');
const UsuarioController = require('./controllers/UsuarioController');
const authMiddleware = require('./middleware/auth');
const permissionMiddleware = require('./middleware/permission');
const InteracaoController = require('./controllers/InteracaoController');

const routes = express.Router();
const upload = multer(multerConfig);


routes.post('/register', authController.register);
routes.post('/login', authController.login);

routes.use(authMiddleware);

routes.get('/dashboard', (req, res) => {
    res.send({ ok: true, user: req.userId });
});
routes.get('/chamados/:chamado_id', ChamadoController.show);

routes.post('/chamados/:chamado_id/interacoes', InteracaoController.store);
routes.post('/chamados', ChamadoController.store);
routes.get('/chamados', ChamadoController.index);
routes.put('/chamados/:chamado_id/status', ChamadoController.update);
routes.post('/chamados/:chamado_id/anexos', upload.single('anexo'), AnexoController.store);
routes.get('/usuarios', permissionMiddleware('admin'), UsuarioController.index);

module.exports = routes;