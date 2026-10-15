// Detalhe do chamado e tudo o que muda nele: abertura, status, prioridade,
// responsável, mensagens e os eventos registrados na timeline
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

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
    it('abre com prioridade média por padrão, em aberto e sem responsável', async () => {
      const { status, data } = await api.req('POST', '/chamados', {
        token: juliana, corpo: { titulo: '  Mouse sem fio parou  ', descricao: 'Trocou a pilha e nada.' },
      });
      expect(status).toBe(201);
      expect(data).toMatchObject({
        id: 18, titulo: 'Mouse sem fio parou', status: 'aberto', prioridade: 'media', usuario_id: U.juliana.id,
      });
      expect(data.responsavel_id ?? null).toBeNull();
    });

    it('aceita a prioridade escolhida', async () => {
      const { data } = await api.req('POST', '/chamados', {
        token: juliana, corpo: { titulo: 'Servidor caiu', descricao: 'Ninguém acessa nada.', prioridade: 'critica' },
      });
      expect(data.prioridade).toBe('critica');
    });

    it.each([
      ['sem título', { descricao: 'x' }],
      ['título curto', { titulo: 'ab', descricao: 'x' }],
      ['sem descrição', { titulo: 'Assunto válido', descricao: '   ' }],
      ['prioridade inválida', { titulo: 'Assunto válido', descricao: 'x', prioridade: 'urgente' }],
    ])('recusa %s', async (_caso, corpo) => {
      expect((await api.req('POST', '/chamados', { token: juliana, corpo })).status).toBe(400);
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

    it('recusa prioridade inválida', async () => {
      expect((await mudar(1, 'urgente', rafael)).status).toBe(400);
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

    it('lista a equipe disponível só para a equipe', async () => {
      const { data } = await api.req('GET', '/equipe', { token: rafael });
      expect(data.map((m) => m.nome)).toEqual(['Carlos Lima', 'Marina Alves', 'Rafael Costa']);
      expect((await api.req('GET', '/equipe', { token: lucas })).status).toBe(403);
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

    it('recusa mensagem vazia e chamado de outra pessoa', async () => {
      expect((await enviar(1, '   ', lucas)).status).toBe(400);
      expect((await enviar(3, 'Oi', lucas)).status).toBe(403);
    });
  });
});
