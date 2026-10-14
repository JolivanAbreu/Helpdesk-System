'use strict';
// Dados de demonstração: um usuário de cada perfil + chamados de exemplo.
// Senha de todos os usuários: 123456

const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const EMAILS = ['admin@helpdesk.com', 'suporte@helpdesk.com', 'usuario@helpdesk.com'];

module.exports = {
  up: async (queryInterface) => {
    const agora = new Date();
    const senha_hash = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('usuarios', [
      { nome: 'Admin', email: EMAILS[0], perfil: 'admin', senha_hash, created_at: agora, updated_at: agora },
      { nome: 'Técnico Suporte', email: EMAILS[1], perfil: 'suporte', senha_hash, created_at: agora, updated_at: agora },
      { nome: 'Usuário Comum', email: EMAILS[2], perfil: 'comum', senha_hash, created_at: agora, updated_at: agora },
    ]);

    const usuarios = await queryInterface.sequelize.query(
      'SELECT id, email FROM usuarios WHERE email IN (:emails)',
      { replacements: { emails: EMAILS }, type: QueryTypes.SELECT }
    );
    const idPorEmail = Object.fromEntries(usuarios.map(u => [u.email, u.id]));
    const comumId = idPorEmail['usuario@helpdesk.com'];
    const suporteId = idPorEmail['suporte@helpdesk.com'];

    await queryInterface.bulkInsert('chamados', [
      {
        titulo: 'Impressora do 2º andar não imprime',
        descricao: 'A impressora HP do 2º andar aparece como offline para todos do setor financeiro desde hoje cedo.',
        status: 'aberto',
        usuario_id: comumId,
        created_at: agora,
        updated_at: agora,
      },
      {
        titulo: 'Sem acesso à VPN',
        descricao: 'Ao conectar na VPN de casa, recebo a mensagem "falha na autenticação". A senha de rede está correta.',
        status: 'em andamento',
        usuario_id: comumId,
        created_at: agora,
        updated_at: agora,
      },
    ]);

    const chamados = await queryInterface.sequelize.query(
      'SELECT id FROM chamados WHERE usuario_id = :comumId AND titulo = :titulo',
      { replacements: { comumId, titulo: 'Sem acesso à VPN' }, type: QueryTypes.SELECT }
    );

    await queryInterface.bulkInsert('interacoes', [
      {
        mensagem: 'Olá! Pode confirmar se o problema acontece também na rede do escritório?',
        usuario_id: suporteId,
        chamado_id: chamados[0].id,
        created_at: agora,
        updated_at: agora,
      },
      {
        mensagem: 'No escritório funciona normalmente, só de casa que falha.',
        usuario_id: comumId,
        chamado_id: chamados[0].id,
        created_at: new Date(agora.getTime() + 60 * 1000),
        updated_at: new Date(agora.getTime() + 60 * 1000),
      },
    ]);
  },

  down: async (queryInterface) => {
    // Apagar os chamados remove interações e anexos por cascata.
    // Eles são apagados antes dos usuários porque a FK de chamados
    // usa SET NULL e deixaria chamados órfãos.
    const usuarios = await queryInterface.sequelize.query(
      'SELECT id FROM usuarios WHERE email IN (:emails)',
      { replacements: { emails: EMAILS }, type: QueryTypes.SELECT }
    );
    const ids = usuarios.map(u => u.id);
    if (ids.length) {
      await queryInterface.bulkDelete('chamados', { usuario_id: ids });
    }
    await queryInterface.bulkDelete('usuarios', { email: EMAILS });
  },
};
