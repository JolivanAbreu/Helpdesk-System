// src/controllers/AdminController.js
const { fn, col } = require('sequelize');
const Chamado = require('../models/Chamado');
const Usuario = require('../models/Usuario');
const { STATUS_CHAMADO, PERFIS } = require('../config/perfis');

// Transforma o resultado de um GROUP BY em { valor: quantidade },
// garantindo zero para as chaves que não apareceram.
function contarPor(linhas, campo, chaves) {
  const resultado = Object.fromEntries(chaves.map((chave) => [chave, 0]));
  linhas.forEach((linha) => {
    resultado[linha[campo]] = Number(linha.total);
  });
  return resultado;
}

module.exports = {
  // Indicadores da tela de administração
  async resumo(req, res) {
    const [chamadosPorStatus, usuariosPorPerfil, usuariosInativos, maisAntigos] = await Promise.all([
      Chamado.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'total']],
        group: ['status'],
        raw: true,
      }),
      Usuario.findAll({
        attributes: ['perfil', [fn('COUNT', col('id')), 'total']],
        where: { ativo: true },
        group: ['perfil'],
        raw: true,
      }),
      Usuario.count({ where: { ativo: false } }),
      // Chamados ainda não resolvidos, do mais antigo para o mais novo
      Chamado.findAll({
        where: { status: ['aberto', 'em andamento'] },
        attributes: ['id', 'titulo', 'status', 'createdAt'],
        include: { association: 'usuario', attributes: ['id', 'nome'] },
        order: [['createdAt', 'ASC']],
        limit: 5,
      }),
    ]);

    const porStatus = contarPor(chamadosPorStatus, 'status', STATUS_CHAMADO);
    const porPerfil = contarPor(usuariosPorPerfil, 'perfil', PERFIS);

    return res.json({
      chamados: {
        total: Object.values(porStatus).reduce((soma, n) => soma + n, 0),
        porStatus,
      },
      usuarios: {
        ativos: Object.values(porPerfil).reduce((soma, n) => soma + n, 0),
        inativos: usuariosInativos,
        porPerfil,
      },
      pendentesMaisAntigos: maisAntigos,
    });
  },
};
