// src/routes.js
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const multerConfig = require('./config/multer');

const authController = require('./controllers/authController');
const ChamadoController = require('./controllers/ChamadoController');
const InteracaoController = require('./controllers/InteracaoController');
const AnexoController = require('./controllers/AnexoController');
const UsuarioController = require('./controllers/UsuarioController');
const AdminController = require('./controllers/AdminController');

const auth = require('./middleware/auth');
const permission = require('./middleware/permission');
const chamadoAccess = require('./middleware/chamadoAccess');

const routes = express.Router();
const upload = multer(multerConfig);

// Limita tentativas de login/cadastro por IP (proteção contra força bruta).
// LIMITE_TENTATIVAS_AUTH permite aumentar o limite nos testes automatizados.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => Number(process.env.LIMITE_TENTATIVAS_AUTH) || 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// ---------- Rotas públicas ----------
routes.post('/register', limiteAuth, authController.register);
routes.post('/login', limiteAuth, authController.login);

// ---------- Daqui para baixo, só com token ----------
routes.use(auth);

routes.get('/me', (req, res) => res.json(req.user));

// Chamados
routes.get('/chamados', ChamadoController.index);
routes.post('/chamados', ChamadoController.store);
routes.get('/chamados/:chamado_id', chamadoAccess, ChamadoController.show);
routes.put('/chamados/:chamado_id/status', chamadoAccess, ChamadoController.update);
routes.put('/chamados/:chamado_id/prioridade', permission('suporte', 'admin'), chamadoAccess, ChamadoController.updatePrioridade);
routes.put('/chamados/:chamado_id/responsavel', permission('suporte', 'admin'), chamadoAccess, ChamadoController.updateResponsavel);
routes.put('/chamados/:chamado_id/categoria', permission('suporte', 'admin'), chamadoAccess, ChamadoController.updateCategoria);

// Técnicos que podem receber chamados (seletor de responsável)
routes.get('/equipe', permission('suporte', 'admin'), ChamadoController.equipe);

// Interações
routes.post('/chamados/:chamado_id/interacoes', chamadoAccess, InteracaoController.store);

// Anexos (o acesso é checado antes do upload gravar o arquivo)
routes.post('/chamados/:chamado_id/anexos', chamadoAccess, upload.single('anexo'), AnexoController.store);
routes.get('/chamados/:chamado_id/anexos/:anexo_id', chamadoAccess, AnexoController.download);

// Administração (somente admin)
routes.get('/admin/resumo', permission('admin'), AdminController.resumo);
routes.get('/usuarios', permission('admin'), UsuarioController.index);
routes.post('/usuarios', permission('admin'), UsuarioController.store);
routes.put('/usuarios/:usuario_id/perfil', permission('admin'), UsuarioController.updatePerfil);
routes.put('/usuarios/:usuario_id/status', permission('admin'), UsuarioController.updateStatus);

module.exports = routes;
