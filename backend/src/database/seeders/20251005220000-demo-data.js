'use strict';
// Dados de demonstração: usuários de todos os perfis e ~2 semanas de chamados
// com prioridades, responsáveis, eventos e conversas.
// Senha de todos os usuários: 123456
// (depende das migrations de "ativo", da fila e de categoria/SLA, que rodam antes dos seeders)

const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const USUARIOS = [
  { chave: 'admin', nome: 'Marina Alves', email: 'admin@helpdesk.com', perfil: 'admin' },
  { chave: 'rafael', nome: 'Rafael Costa', email: 'suporte@helpdesk.com', perfil: 'suporte' },
  { chave: 'carlos', nome: 'Carlos Lima', email: 'carlos@helpdesk.com', perfil: 'suporte' },
  { chave: 'lucas', nome: 'Lucas Pereira', email: 'usuario@helpdesk.com', perfil: 'comum' },
  { chave: 'juliana', nome: 'Juliana Rocha', email: 'juliana@helpdesk.com', perfil: 'comum' },
  { chave: 'pedro', nome: 'Pedro Santos', email: 'pedro@helpdesk.com', perfil: 'comum' },
  // Conta desativada, para demonstrar o recurso na tela de administração
  { chave: 'ana', nome: 'Ana Souza', email: 'ana@helpdesk.com', perfil: 'comum', ativo: false },
];
const EMAILS = USUARIOS.map((u) => u.email);

// dias: há quantos dias foi aberto | resolveuEm: horas até resolver
// respondeuEm: horas até a primeira resposta da equipe (padrão: 30 min)
// Os valores foram escolhidos para a fila mostrar todas as situações de SLA:
// no prazo, em risco (5), estourado (3 e 6) e resolvido fora do prazo (10 e 13).
const CHAMADOS = [
  { titulo: 'Impressora do 2º andar não imprime', descricao: 'A impressora HP do 2º andar aparece como offline para todos do setor financeiro desde hoje cedo.', de: 'lucas', prioridade: 'alta', categoria: 'hardware', status: 'aberto', dias: 0.2 },
  { titulo: 'Sem acesso à VPN', descricao: 'Ao conectar na VPN de casa, recebo a mensagem "falha na autenticação". A senha de rede está correta.', de: 'lucas', prioridade: 'media', categoria: 'rede', status: 'em andamento', resp: 'rafael', dias: 0.7,
    conversa: [['rafael', 'Olá, Lucas! Pode confirmar se o problema acontece também na rede do escritório?'], ['lucas', 'No escritório funciona normalmente, só de casa que falha.'], ['rafael', 'Obrigado. Vou verificar o certificado da VPN no seu usuário e te retorno.']] },
  { titulo: 'Computador reiniciando sozinho', descricao: 'O desktop reinicia sem aviso várias vezes ao dia, principalmente ao abrir planilhas grandes.', de: 'juliana', prioridade: 'alta', categoria: 'hardware', status: 'em andamento', resp: 'carlos', dias: 2,
    conversa: [['carlos', 'Juliana, vou passar na sua mesa às 14h para verificar a fonte e a temperatura do equipamento.']] },
  { titulo: 'Instalação do Power BI Desktop', descricao: 'Preciso do Power BI Desktop instalado para montar os relatórios do trimestre.', de: 'pedro', prioridade: 'baixa', categoria: 'software', status: 'aberto', dias: 0.5 },
  { titulo: 'Backup noturno não executado', descricao: 'O relatório de backup de hoje indica falha na rotina do servidor de arquivos.', de: 'pedro', prioridade: 'critica', categoria: 'software', status: 'em andamento', resp: 'rafael', dias: 0.13,
    conversa: [['rafael', 'Já estou verificando os logs da rotina de backup no servidor.']] },
  { titulo: 'Telefone IP sem sinal', descricao: 'O ramal 2045 está mudo desde a mudança de mesa.', de: 'juliana', prioridade: 'media', categoria: 'rede', status: 'aberto', dias: 1.5 },
  { titulo: 'E-mail não sincroniza no celular', descricao: 'O Outlook do celular parou de receber e-mails desde ontem.', de: 'juliana', prioridade: 'media', categoria: 'email', status: 'resolvido', resp: 'rafael', dias: 3, resolveuEm: 5 },
  { titulo: 'Sistema ERP fora do ar', descricao: 'Ninguém do comercial consegue acessar o ERP. Erro 503 na tela de login.', de: 'pedro', prioridade: 'critica', categoria: 'software', status: 'resolvido', resp: 'carlos', dias: 4, resolveuEm: 2 },
  { titulo: 'Troca da senha do Wi-Fi de visitantes', descricao: 'A senha do Wi-Fi de visitantes precisa ser trocada para o evento de sexta.', de: 'lucas', prioridade: 'baixa', categoria: 'rede', status: 'resolvido', resp: 'rafael', dias: 5, resolveuEm: 24 },
  { titulo: 'Monitor piscando', descricao: 'O monitor secundário pisca a cada poucos minutos.', de: 'juliana', prioridade: 'media', categoria: 'hardware', status: 'resolvido', resp: 'carlos', dias: 6, resolveuEm: 30 },
  { titulo: 'Acesso à pasta do financeiro', descricao: 'Preciso de acesso de leitura à pasta compartilhada do financeiro.', de: 'pedro', prioridade: 'media', categoria: 'acessos', status: 'resolvido', resp: 'rafael', dias: 7, resolveuEm: 3 },
  { titulo: 'Teclado com teclas falhando', descricao: 'As teclas A e S do teclado não respondem.', de: 'lucas', prioridade: 'baixa', categoria: 'hardware', status: 'resolvido', resp: 'carlos', dias: 8, resolveuEm: 30 },
  { titulo: 'Lentidão no servidor de arquivos', descricao: 'Abrir arquivos da rede está levando mais de um minuto.', de: 'juliana', prioridade: 'alta', categoria: 'rede', status: 'resolvido', resp: 'rafael', dias: 9, resolveuEm: 11, respondeuEm: 3 },
  { titulo: 'Criar usuário para novo colaborador', descricao: 'O novo analista começa na segunda e precisa de usuário de rede e e-mail.', de: 'pedro', prioridade: 'media', categoria: 'acessos', status: 'resolvido', resp: 'carlos', dias: 10, resolveuEm: 6 },
  { titulo: 'Antivírus bloqueando sistema interno', descricao: 'O antivírus está colocando o executável do sistema de ponto em quarentena.', de: 'lucas', prioridade: 'alta', categoria: 'software', status: 'resolvido', resp: 'rafael', dias: 11, resolveuEm: 4 },
  { titulo: 'Webcam não funciona no Teams', descricao: 'A webcam aparece como "em uso por outro aplicativo" nas reuniões.', de: 'juliana', prioridade: 'baixa', categoria: 'hardware', status: 'resolvido', resp: 'carlos', dias: 12, resolveuEm: 26 },
  { titulo: 'Licença do Office expirada', descricao: 'O Word abre em modo somente leitura informando licença expirada.', de: 'lucas', prioridade: 'media', categoria: 'software', status: 'resolvido', resp: 'carlos', dias: 13, resolveuEm: 2 },
];

const HORA = 60 * 60 * 1000;

module.exports = {
  up: async (queryInterface) => {
    const agora = Date.now();
    const quando = (ms) => new Date(ms);
    const senha_hash = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('usuarios', USUARIOS.map((u) => ({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      ativo: u.ativo !== false,
      senha_hash,
      created_at: quando(agora - 30 * 24 * HORA),
      updated_at: quando(agora - 30 * 24 * HORA),
    })));

    const linhas = await queryInterface.sequelize.query(
      'SELECT id, email FROM usuarios WHERE email IN (:emails)',
      { replacements: { emails: EMAILS }, type: QueryTypes.SELECT }
    );
    const idPorEmail = Object.fromEntries(linhas.map((l) => [l.email, l.id]));
    const id = Object.fromEntries(USUARIOS.map((u) => [u.chave, idPorEmail[u.email]]));

    for (const c of CHAMADOS) {
      const abertoEm = agora - c.dias * 24 * HORA;
      const resolvidoEm = c.resolveuEm ? abertoEm + c.resolveuEm * HORA : null;
      const MIN = 60 * 1000;

      // Timeline: técnico assume, responde, conversa e (se for o caso) resolve
      const timeline = [];
      if (c.resp) {
        const assumiuEm = abertoEm + 20 * MIN;
        timeline.push({ tipo: 'evento', autor: c.resp, mensagem: 'alterou o status de "aberto" para "em andamento"', em: assumiuEm });
        timeline.push({ tipo: 'evento', autor: c.resp, mensagem: 'assumiu o chamado', em: assumiuEm + 1000 });
        if (c.conversa) {
          c.conversa.forEach(([autor, mensagem], i) => {
            timeline.push({ tipo: 'mensagem', autor, mensagem, em: assumiuEm + (i + 1) * 20 * MIN });
          });
        } else {
          const respondeuEm = abertoEm + (c.respondeuEm ? c.respondeuEm * HORA : 30 * MIN);
          timeline.push({ tipo: 'mensagem', autor: c.resp, mensagem: 'Recebido! Já estou verificando.', em: respondeuEm });
        }
      }
      if (resolvidoEm) {
        timeline.push({ tipo: 'mensagem', autor: c.resp, mensagem: 'Problema resolvido. Pode confirmar se está tudo certo por aí?', em: resolvidoEm - 1000 });
        timeline.push({ tipo: 'evento', autor: c.resp, mensagem: 'alterou o status de "em andamento" para "resolvido"', em: resolvidoEm });
      }

      // Primeira resposta = primeira mensagem de alguém da equipe
      const primeiraResposta = timeline.find((i) => i.tipo === 'mensagem' && i.autor === c.resp);
      const ultimaAtualizacao = resolvidoEm || (c.resp ? abertoEm + 20 * MIN : abertoEm);

      await queryInterface.bulkInsert('chamados', [{
        titulo: c.titulo,
        descricao: c.descricao,
        status: c.status,
        prioridade: c.prioridade,
        categoria: c.categoria,
        usuario_id: id[c.de],
        responsavel_id: c.resp ? id[c.resp] : null,
        resolvido_em: resolvidoEm ? quando(resolvidoEm) : null,
        primeira_resposta_em: primeiraResposta ? quando(primeiraResposta.em) : null,
        created_at: quando(abertoEm),
        updated_at: quando(ultimaAtualizacao),
      }]);

      const [{ id: chamadoId }] = await queryInterface.sequelize.query(
        'SELECT id FROM chamados WHERE titulo = :titulo',
        { replacements: { titulo: c.titulo }, type: QueryTypes.SELECT }
      );

      if (timeline.length) {
        await queryInterface.bulkInsert('interacoes', timeline.map((i) => ({
          mensagem: i.mensagem,
          tipo: i.tipo,
          usuario_id: id[i.autor],
          chamado_id: chamadoId,
          created_at: quando(i.em),
          updated_at: quando(i.em),
        })));
      }
    }
  },

  down: async (queryInterface) => {
    // Apagar os chamados remove interações e anexos por cascata.
    // Eles são apagados antes dos usuários porque a FK de chamados
    // usa SET NULL e deixaria chamados órfãos.
    const usuarios = await queryInterface.sequelize.query(
      'SELECT id FROM usuarios WHERE email IN (:emails)',
      { replacements: { emails: EMAILS }, type: QueryTypes.SELECT }
    );
    const ids = usuarios.map((u) => u.id);
    if (ids.length) {
      await queryInterface.bulkDelete('chamados', { usuario_id: ids });
    }
    await queryInterface.bulkDelete('usuarios', { email: EMAILS });
  },
};
