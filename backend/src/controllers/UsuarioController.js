// src/controllers/UsuarioController.js
const bcrypt = require('bcryptjs');
const { literal } = require('sequelize');
const Usuario = require('../models/Usuario');
const { PERFIS, isEquipe } = require('../config/perfis');
const { texto, validarCadastro, validarDadosOpcionais } = require('../utils/validacao');

// Campos devolvidos ao frontend (nunca o hash da senha)
const DADOS_FUNCIONARIO = ['setor', 'cargo', 'ramal', 'localizacao'];
const usuarioPublico = ({
  id, nome, email, perfil, ativo, createdAt, setor, cargo, ramal, localizacao,
}) => ({
  id, nome, email, perfil, ativo, createdAt,
  // Campos não informados na criação ainda não existem na instância
  setor: setor ?? null, cargo: cargo ?? null, ramal: ramal ?? null, localizacao: localizacao ?? null,
});

module.exports = {
  // Lista todos os usuários com a quantidade de chamados abertos por cada um
  async index(req, res) {
    const usuarios = await Usuario.findAll({
      attributes: [
        'id', 'nome', 'email', 'perfil', 'ativo', 'createdAt', ...DADOS_FUNCIONARIO,
        [literal('(SELECT COUNT(*) FROM chamados AS c WHERE c.usuario_id = `Usuario`.`id`)'), 'total_chamados'],
      ],
      order: [['nome', 'ASC']],
    });

    return res.json(usuarios);
  },

  // Cria um usuário já com o perfil escolhido (ex.: um técnico de suporte)
  async store(req, res) {
    const erro = validarCadastro(req.body);
    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const perfil = req.body.perfil || 'comum';
    if (!PERFIS.includes(perfil)) {
      return res.status(400).json({ error: `Perfil inválido. Use: ${PERFIS.join(', ')}.` });
    }

    const { erro: erroDados, dados } = validarDadosOpcionais(req.body, DADOS_FUNCIONARIO);
    if (erroDados) return res.status(400).json({ error: erroDados });

    const email = texto(req.body.email).toLowerCase();
    if (await Usuario.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const usuario = await Usuario.create({
      nome: texto(req.body.nome),
      email,
      perfil,
      ...dados,
      senha_hash: await bcrypt.hash(req.body.senha, 10),
    });

    return res.status(201).json({ ...usuarioPublico(usuario), total_chamados: 0 });
  },

  // Admin altera setor, cargo, ramal e localização de um usuário
  async updateDados(req, res) {
    const usuario = await Usuario.findByPk(req.params.usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const { erro, dados } = validarDadosOpcionais(req.body, DADOS_FUNCIONARIO);
    if (erro) return res.status(400).json({ error: erro });

    await usuario.update(dados);
    return res.json(usuarioPublico(usuario));
  },

  // O próprio usuário atualiza o contato que preenche os chamados.
  // Setor e cargo são dados do RH: só o admin altera.
  async updateMeuContato(req, res) {
    const { erro, dados } = validarDadosOpcionais(req.body, ['ramal', 'localizacao']);
    if (erro) return res.status(400).json({ error: erro });

    await req.user.update(dados);
    return res.json(req.user);
  },

  // Altera o perfil de um usuário
  async updatePerfil(req, res) {
    const { perfil } = req.body;

    if (!PERFIS.includes(perfil)) {
      return res.status(400).json({ error: `Perfil inválido. Use: ${PERFIS.join(', ')}.` });
    }

    const usuario = await Usuario.findByPk(req.params.usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Evita que o admin tire o próprio acesso e o sistema fique sem admin
    if (usuario.id === req.userId && perfil !== 'admin') {
      return res.status(400).json({ error: 'Você não pode remover o seu próprio perfil de admin.' });
    }

    usuario.perfil = perfil;
    await usuario.save();
    // Quem deixa a equipe sai também dos grupos técnicos
    if (!isEquipe(usuario)) await usuario.setGrupos([]);

    return res.json(usuarioPublico(usuario));
  },

  // Ativa ou desativa uma conta
  async updateStatus(req, res) {
    const { ativo } = req.body;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ error: 'Informe "ativo" como true ou false.' });
    }

    const usuario = await Usuario.findByPk(req.params.usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (usuario.id === req.userId && !ativo) {
      return res.status(400).json({ error: 'Você não pode desativar a sua própria conta.' });
    }

    usuario.ativo = ativo;
    await usuario.save();

    return res.json(usuarioPublico(usuario));
  },
};
