// Detalhe do chamado e tudo o que muda nele: abertura, status, prioridade,
// categoria, responsável, transferência, mensagens e os eventos da timeline
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';
import { GRUPO, SUB } from '../apoio/catalogo.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

describe.each(clientes.map((c) => [c.nome, c]))('Chamado (%s)', (_nome, api) => {
  let lucas; let juliana; let rafael; let carlos;
  beforeEach(async () => {
    await api.reiniciar();
    [lucas, juliana, rafael, carlos] = await Promise.all(
      [U.lucas, U.juliana, U.rafael, U.carlos].map((u) => api.entrar(u.email))
    );
  });

  const detalhe = async (id, token = rafael) => (await api.req('GET', `/chamados/${id}`, { token })).data;
  const eventos = (chamado) => chamado.interacoes.filter((i) => i.tipo === 'evento').map((i) => `${i.usuario.nome} ${i.mensagem}`);

  describe('acesso', () => {
    it('o solicitante abre o próprio chamado, com timeline e anexos', async () => {
      const { status, data } = await api.req('GET', '/chamados/2', { token: lucas });
      expect(status).toBe(200);
      expect(data).toMatchObject({ id: 2, titulo: 'Sem acesso à VPN', status: 'em andamento', prioridade: 'media' });
      expect(data.usuario).toMatchObject({ id: U.lucas.id });
      expect(data.responsavel).toMatchObject({ id: U.rafael.id });
      expect(data.anexos).toEqual([]);
      expect(data.interacoes.map((i) => i.tipo)).toEqual(['evento', 'evento', 'mensagem', 'mensagem', 'mensagem']);
      expect(data.interacoes[2]).toMatchObject({ usuario: { id: U.rafael.id, perfil: 'suporte' } });
    });

    it('outro colaborador não abre o chamado', async () => {
      const { status } = await api.req('GET', '/chamados/2', { token: juliana });
      expect(status).toBe(403);
    });

    it('a equipe abre qualquer chamado', async () => {
      expect((await api.req('GET', '/chamados/3', { token: rafael })).status).toBe(200);
    });

    it('responde 404 para chamado inexistente e 400 para ID inválido', async () => {
      expect((await api.req('GET', '/chamados/999', { token: rafael })).status).toBe(404);
      expect((await api.req('GET', '/chamados/abc', { token: rafael })).status).toBe(400);
    });
  });

  describe('abertura', () => {
    const abrir = (corpo, token = juliana) => api.req('POST', '/chamados', { token, corpo });
    const horas = (chamado, prazo) => Math.round((Date.parse(chamado.sla[prazo].prazo) - Date.parse(chamado.createdAt)) / 360000) / 10;

    it('a subcategoria define prioridade, prazos e grupo; abre em aberto e sem responsável', async () => {
      const { status, data } = await abrir({ titulo: '  Mouse sem fio parou  ', descricao: 'Trocou a pilha e nada.', categoria_id: SUB.perifericos });
      expect(status).toBe(201);
      expect(data).toMatchObject({
        id: 18, titulo: 'Mouse sem fio parou', status: 'aberto', prioridade: 'baixa',
        categoria_id: SUB.perifericos, grupo_id: GRUPO.n1, usuario_id: U.juliana.id,
      });
      expect(data.categoria).toMatchObject({ id: SUB.perifericos, nome: 'Teclado, mouse e webcam', pai: { nome: 'Hardware', icone: 'hardware' } });
      expect(data.grupo).toEqual({ id: GRUPO.n1, nome: 'Service Desk (N1)' });
      expect(data.responsavel_id ?? null).toBeNull();
      expect(data.sla.resposta.situacao).toBe('no_prazo');
      expect(data.sla.solucao.situacao).toBe('no_prazo');
      // baixa: resposta em 8 h e solução em 72 h a partir da abertura
      expect(horas(data, 'resposta')).toBe(8);
      expect(horas(data, 'solucao')).toBe(72);
    });

    it('a prioridade enviada pelo solicitante é ignorada', async () => {
      const { data } = await abrir({ titulo: 'Wi-Fi lento', descricao: 'Na sala de reunião.', categoria_id: SUB.wifi, prioridade: 'critica' });
      expect(data.prioridade).toBe('baixa');
    });

    it('a subcategoria pode encaminhar direto para um grupo N2', async () => {
      const { data } = await abrir({ titulo: 'ERP fora do ar', descricao: 'Erro 503.', categoria_id: SUB.sistemaForaDoAr });
      expect(data).toMatchObject({ prioridade: 'critica', grupo_id: GRUPO.sistemas });
      expect(horas(data, 'resposta')).toBe(1);
      expect(horas(data, 'solucao')).toBe(4);
    });

    it('usa os prazos próprios da subcategoria quando diferem da prioridade', async () => {
      const { data } = await abrir({ titulo: 'Senha expirada', descricao: 'Não consigo entrar.', categoria_id: SUB.redefinirSenha });
      expect(data.prioridade).toBe('alta');
      expect(horas(data, 'resposta')).toBe(0.5);
      expect(horas(data, 'solucao')).toBe(2);
    });

    it.each([
      ['sem título', { descricao: 'x', categoria_id: SUB.impressora }],
      ['título curto', { titulo: 'ab', descricao: 'x', categoria_id: SUB.impressora }],
      ['sem descrição', { titulo: 'Assunto válido', descricao: '   ', categoria_id: SUB.impressora }],
      ['sem categoria', { titulo: 'Assunto válido', descricao: 'x' }],
      ['categoria principal no lugar da subcategoria', { titulo: 'Assunto válido', descricao: 'x', categoria_id: 1 }],
      ['categoria inexistente', { titulo: 'Assunto válido', descricao: 'x', categoria_id: 999 }],
      ['categoria em texto', { titulo: 'Assunto válido', descricao: 'x', categoria_id: String(SUB.impressora) }],
    ])('recusa %s', async (_caso, corpo) => {
      expect((await abrir(corpo)).status).toBe(400);
    });

    it('recusa subcategoria desativada', async () => {
      const marina = await api.entrar(U.admin.email);
      await api.req('PUT', `/categorias/${SUB.wifi}`, { token: marina, corpo: { ativo: false } });
      expect((await abrir({ titulo: 'Wi-Fi lento', descricao: 'x', categoria_id: SUB.wifi })).status).toBe(400);
    });

    it('mudanças no catálogo não alteram os prazos de chamados já abertos', async () => {
      const marina = await api.entrar(U.admin.email);
      const antes = await detalhe(1);
      const editar = await api.req('PUT', `/categorias/${SUB.impressora}`, {
        token: marina, corpo: { prioridade: 'critica', sla_resposta_horas: 1, sla_solucao_horas: 2 },
      });
      expect(editar.status).toBe(200);
      const depois = await detalhe(1);
      expect(depois.prioridade).toBe('alta');
      expect(depois.sla).toEqual(antes.sla);

      // Os novos chamados já seguem a regra nova
      const { data } = await abrir({ titulo: 'Impressora parou', descricao: 'x', categoria_id: SUB.impressora });
      expect(data.prioridade).toBe('critica');
      expect(horas(data, 'solucao')).toBe(2);
    });
  });

  describe('status', () => {
    const mudar = (id, status, token) => api.req('PUT', `/chamados/${id}/status`, { token, corpo: { status } });

    it('o solicitante encerra e reabre, mas não coloca em andamento', async () => {
      expect((await mudar(1, 'em andamento', lucas)).status).toBe(403);

      const resolvido = await mudar(1, 'resolvido', lucas);
      expect(resolvido.status).toBe(200);
      expect(resolvido.data.resolvido_em).toEqual(expect.any(String));

      const reaberto = await mudar(1, 'aberto', lucas);
      expect(reaberto.data.status).toBe('aberto');
      expect(reaberto.data.resolvido_em ?? null).toBeNull();

      expect(eventos(await detalhe(1))).toEqual([
        'Lucas Pereira alterou o status de "aberto" para "resolvido"',
        'Lucas Pereira alterou o status de "resolvido" para "aberto"',
      ]);
    });

    it('quem da equipe põe em andamento um chamado sem responsável passa a ser o responsável', async () => {
      const { data } = await mudar(4, 'em andamento', carlos);
      expect(data.responsavel_id).toBe(U.carlos.id);
      expect(eventos(await detalhe(4))).toEqual([
        'Carlos Lima alterou o status de "aberto" para "em andamento"',
        'Carlos Lima assumiu o chamado',
      ]);
    });

    it('não troca o responsável de quem já tem um', async () => {
      await mudar(2, 'aberto', carlos);
      const { data } = await mudar(2, 'em andamento', carlos);
      expect(data.responsavel_id).toBe(U.rafael.id);
    });

    it('repetir o status atual não gera evento', async () => {
      const antes = eventos(await detalhe(2)).length;
      expect((await mudar(2, 'em andamento', rafael)).status).toBe(200);
      expect(eventos(await detalhe(2))).toHaveLength(antes);
    });

    it('recusa status inválido e chamado de outra pessoa', async () => {
      expect((await mudar(2, 'pausado', rafael)).status).toBe(400);
      expect((await mudar(3, 'resolvido', lucas)).status).toBe(403);
    });
  });

  describe('prioridade', () => {
    const mudar = (id, prioridade, token) => api.req('PUT', `/chamados/${id}/prioridade`, { token, corpo: { prioridade } });

    it('a equipe altera e o evento usa o nome legível', async () => {
      const { status, data } = await mudar(1, 'critica', rafael);
      expect(status).toBe(200);
      expect(data.prioridade).toBe('critica');
      expect(eventos(await detalhe(1))).toEqual(['Rafael Costa alterou a prioridade de alta para crítica']);
    });

    it('o solicitante não altera', async () => {
      expect((await mudar(1, 'critica', lucas)).status).toBe(403);
    });

    it('os prazos de SLA passam a seguir as metas da nova prioridade', async () => {
      // chamado 4: baixa, aberto há 12 h (prazo de 72 h); como crítica, o prazo seria 4 h
      expect((await detalhe(4)).sla.solucao.situacao).toBe('no_prazo');
      const { data } = await mudar(4, 'critica', rafael);
      expect(data.sla.solucao.situacao).toBe('estourado');
    });

    it('recusa prioridade inválida', async () => {
      expect((await mudar(1, 'urgente', rafael)).status).toBe(400);
    });
  });

  describe('categoria', () => {
    const mudar = (id, categoria_id, token) => api.req('PUT', `/chamados/${id}/categoria`, { token, corpo: { categoria_id } });

    it('a equipe reclassifica: prioridade e prazos seguem a nova subcategoria', async () => {
      // chamado 6: Rede › Telefone IP (média), aberto há 36 h, sem responsável, no grupo Infraestrutura
      const { status, data } = await mudar(6, SUB.redefinirSenha, rafael);
      expect(status).toBe(200);
      expect(data).toMatchObject({ categoria_id: SUB.redefinirSenha, prioridade: 'alta' });
      expect(data.categoria.pai.nome).toBe('Acessos e senhas');
      expect(Date.parse(data.sla.solucao.prazo) - Date.parse(data.createdAt)).toBe(2 * 3600000);
      expect(data.sla.solucao.situacao).toBe('estourado');
      // grupo e responsável não mudam (para isso existe a transferência)
      expect(data.grupo_id).toBe(GRUPO.infra);
      expect(eventos(await detalhe(6))).toEqual([
        'Rafael Costa alterou a categoria de Rede e internet › Telefone IP para Acessos e senhas › Redefinir senha (prioridade alta)',
      ]);
    });

    it('sem mudança de prioridade, o evento não a menciona', async () => {
      await mudar(6, SUB.vpn, rafael);
      expect(eventos(await detalhe(6))).toEqual(['Rafael Costa alterou a categoria de Rede e internet › Telefone IP para Rede e internet › VPN']);
    });

    it('repetir a subcategoria atual não gera evento', async () => {
      expect((await mudar(6, SUB.telefone, rafael)).status).toBe(200);
      expect(eventos(await detalhe(6))).toEqual([]);
    });

    it('o solicitante não altera e categoria inválida é recusada', async () => {
      expect((await mudar(1, SUB.vpn, lucas)).status).toBe(403);
      expect((await mudar(1, 1, rafael)).status).toBe(400);
      expect((await mudar(1, 999, rafael)).status).toBe(400);
    });
  });

  describe('responsável', () => {
    const definir = (id, responsavel_id, token) => api.req('PUT', `/chamados/${id}/responsavel`, { token, corpo: { responsavel_id } });

    it('assumir, repassar e devolver para a fila geram eventos', async () => {
      expect((await definir(6, U.rafael.id, rafael)).data.responsavel_id).toBe(U.rafael.id);
      expect((await definir(6, U.carlos.id, rafael)).data.responsavel_id).toBe(U.carlos.id);
      expect((await definir(6, null, carlos)).data.responsavel_id ?? null).toBeNull();
      expect(eventos(await detalhe(6))).toEqual([
        'Rafael Costa assumiu o chamado',
        'Rafael Costa atribuiu o chamado a Carlos Lima',
        'Carlos Lima removeu o responsável do chamado',
      ]);
    });

    it.each([
      ['um colaborador', () => U.juliana.id],
      ['uma conta desativada', () => U.ana.id],
      ['um ID em texto', () => String(U.carlos.id)],
      ['um usuário inexistente', () => 999],
    ])('recusa atribuir a %s', async (_caso, id) => {
      expect((await definir(6, id(), rafael)).status).toBe(400);
    });

    it('o solicitante não define responsável', async () => {
      expect((await definir(1, U.rafael.id, lucas)).status).toBe(403);
    });

    it('lista a equipe disponível, com os grupos de cada um, só para a equipe', async () => {
      const { data } = await api.req('GET', '/equipe', { token: rafael });
      expect(data.map((m) => m.nome)).toEqual(['Carlos Lima', 'Marina Alves', 'Rafael Costa']);
      expect(data.map((m) => m.grupos.map((g) => g.id))).toEqual([[GRUPO.n1, GRUPO.sistemas], [], [GRUPO.n1, GRUPO.infra]]);
      expect((await api.req('GET', '/equipe', { token: lucas })).status).toBe(403);
    });
  });

  describe('transferência', () => {
    const transferir = (id, corpo, token = rafael) => api.req('PUT', `/chamados/${id}/transferencia`, { token, corpo });

    it('para outro grupo: o chamado volta para a fila do grupo, sem responsável', async () => {
      // chamado 3: Hardware, grupo N1, com Carlos
      const { status, data } = await transferir(3, { grupo_id: GRUPO.infra, motivo: 'Precisa trocar a fonte no laboratório.' }, carlos);
      expect(status).toBe(200);
      expect(data).toMatchObject({ grupo_id: GRUPO.infra, grupo: { nome: 'Infraestrutura (N2)' } });
      expect(data.responsavel_id ?? null).toBeNull();
      expect(eventos(await detalhe(3)).at(-1)).toBe(
        'Carlos Lima transferiu o chamado para Infraestrutura (N2). Motivo: Precisa trocar a fonte no laboratório.'
      );
    });

    it('para grupo e técnico ao mesmo tempo', async () => {
      const { data } = await transferir(1, { grupo_id: GRUPO.infra, responsavel_id: U.rafael.id, motivo: 'Problema no servidor de impressão.' });
      expect(data).toMatchObject({ grupo_id: GRUPO.infra, responsavel_id: U.rafael.id });
      expect(eventos(await detalhe(1))).toEqual([
        'Rafael Costa transferiu o chamado para Infraestrutura (N2) / Rafael Costa. Motivo: Problema no servidor de impressão.',
      ]);
    });

    it('só para outro técnico, mantendo o grupo', async () => {
      const { data } = await transferir(3, { responsavel_id: U.rafael.id, motivo: 'Carlos de férias.' }, carlos);
      expect(data).toMatchObject({ grupo_id: GRUPO.n1, responsavel_id: U.rafael.id });
    });

    it('o técnico precisa fazer parte do grupo de destino', async () => {
      const { status, data } = await transferir(1, { grupo_id: GRUPO.infra, responsavel_id: U.carlos.id, motivo: 'Teste' });
      expect(status).toBe(400);
      expect(data.error).toBe('Carlos Lima não faz parte do grupo Infraestrutura (N2).');
    });

    it.each([
      ['sem motivo', { grupo_id: GRUPO.infra }],
      ['motivo em branco', { grupo_id: GRUPO.infra, motivo: '   ' }],
      ['motivo longo demais', { grupo_id: GRUPO.infra, motivo: 'x'.repeat(501) }],
      ['sem destino', { motivo: 'Escalonar' }],
      ['grupo inexistente', { grupo_id: 999, motivo: 'Escalonar' }],
      ['técnico que é colaborador', { responsavel_id: U.juliana.id, motivo: 'Escalonar' }],
      ['técnico desativado', { responsavel_id: U.ana.id, motivo: 'Escalonar' }],
      ['mesmo grupo e técnico de hoje', { grupo_id: GRUPO.n1, responsavel_id: U.carlos.id, motivo: 'Escalonar' }],
    ])('recusa %s', async (_caso, corpo) => {
      expect((await transferir(3, corpo)).status).toBe(400);
    });

    it('recusa grupo desativado', async () => {
      const marina = await api.entrar(U.admin.email);
      await api.req('PUT', `/grupos/${GRUPO.sistemas}`, { token: marina, corpo: { ativo: false } });
      expect((await transferir(3, { grupo_id: GRUPO.sistemas, motivo: 'Escalonar' })).status).toBe(400);
    });

    it('o solicitante não transfere', async () => {
      expect((await transferir(1, { grupo_id: GRUPO.infra, motivo: 'Quero outro' }, lucas)).status).toBe(403);
    });
  });

  describe('notas internas', () => {
    const anotar = (id, mensagem, token) => api.req('POST', `/chamados/${id}/interacoes`, { token, corpo: { mensagem, interna: true } });

    it('a equipe registra a nota e só a equipe a vê', async () => {
      const { status, data } = await anotar(2, 'Certificado do Lucas vence amanhã.', rafael);
      expect(status).toBe(201);
      expect(data.tipo).toBe('nota');

      const naEquipe = (await detalhe(2, carlos)).interacoes.filter((i) => i.tipo === 'nota');
      expect(naEquipe.map((i) => i.mensagem)).toEqual(['Certificado do Lucas vence amanhã.']);

      const doSolicitante = (await detalhe(2, lucas)).interacoes;
      expect(doSolicitante.some((i) => i.tipo === 'nota')).toBe(false);
    });

    it('o solicitante não escreve notas internas', async () => {
      expect((await anotar(1, 'Quero ver isso', lucas)).status).toBe(403);
    });

    it('nota interna não conta como resposta ao solicitante', async () => {
      await anotar(1, 'Verificar driver da impressora.', rafael);
      expect((await detalhe(1)).primeira_resposta_em ?? null).toBeNull();
    });
  });

  describe('mensagens', () => {
    const enviar = (id, mensagem, token) => api.req('POST', `/chamados/${id}/interacoes`, { token, corpo: { mensagem } });

    it('solicitante e equipe conversam no chamado', async () => {
      expect((await enviar(1, 'Alguma novidade?', lucas)).status).toBe(201);
      const { status, data } = await enviar(1, '  Estou a caminho.  ', rafael);
      expect(status).toBe(201);
      expect(data).toMatchObject({ mensagem: 'Estou a caminho.', tipo: 'mensagem', usuario_id: U.rafael.id });

      const chamado = await detalhe(1);
      expect(chamado.interacoes.map((i) => i.mensagem)).toEqual(['Alguma novidade?', 'Estou a caminho.']);
    });

    it('a primeira mensagem da equipe registra a resposta para o SLA', async () => {
      // O próprio solicitante escrevendo não conta como resposta
      await enviar(1, 'Ainda sem imprimir.', lucas);
      expect((await detalhe(1)).primeira_resposta_em ?? null).toBeNull();

      await enviar(1, 'Vou verificar.', rafael);
      const chamado = await detalhe(1);
      expect(chamado.primeira_resposta_em).toEqual(expect.any(String));
      // alta: resposta em até 2 h, mas o chamado foi aberto há 4,8 h
      expect(chamado.sla.resposta.situacao).toBe('violado');
    });

    it('resposta dentro do prazo fica como cumprida', async () => {
      const { data: novo } = await api.req('POST', '/chamados', {
        token: lucas, corpo: { titulo: 'Mouse parou', descricao: 'Não clica.', categoria_id: SUB.perifericos },
      });
      await enviar(novo.id, 'Troque a pilha, por favor.', carlos);
      expect((await detalhe(novo.id)).sla.resposta.situacao).toBe('cumprido');
    });

    it('recusa mensagem vazia e chamado de outra pessoa', async () => {
      expect((await enviar(1, '   ', lucas)).status).toBe(400);
      expect((await enviar(3, 'Oi', lucas)).status).toBe(403);
    });
  });
});
