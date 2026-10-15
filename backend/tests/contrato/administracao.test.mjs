// Indicadores e gestão de usuários (somente administrador)
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

describe.each(clientes.map((c) => [c.nome, c]))('Administração (%s)', (_nome, api) => {
  let admin; let rafael; let lucas;
  beforeEach(async () => {
    await api.reiniciar();
    api.esquecerTokens();
    [admin, rafael, lucas] = await Promise.all([U.admin, U.rafael, U.lucas].map((u) => api.entrar(u.email)));
  });

  describe('indicadores', () => {
    it('só o administrador acessa', async () => {
      expect((await api.req('GET', '/admin/resumo', { token: rafael })).status).toBe(403);
      expect((await api.req('GET', '/admin/resumo', { token: lucas })).status).toBe(403);
    });

    it('calcula os números a partir dos chamados', async () => {
      const { status, data } = await api.req('GET', '/admin/resumo', { token: admin, params: { fuso: 180 } });
      expect(status).toBe(200);
      expect(data.chamados).toEqual({
        total: 17,
        porStatus: { aberto: 3, 'em andamento': 3, resolvido: 11 },
        pendentesPorPrioridade: { critica: 1, alta: 2, media: 2, baixa: 1 },
        semResponsavel: 3,
      });
      expect(data.resolucao).toEqual({ periodoDias: 30, resolvidos: 11, horasMedias: 11.8 });
      expect(data.usuarios).toEqual({ ativos: 6, inativos: 1, porPerfil: { comum: 3, suporte: 2, admin: 1 } });
    });

    it('mede a carga e as entregas de cada técnico', async () => {
      const { data } = await api.req('GET', '/admin/resumo', { token: admin });
      expect(data.equipe).toEqual([
        { id: U.carlos.id, nome: 'Carlos Lima', perfil: 'suporte', pendentes: 1, resolvidos: 6, horasMedias: 14.3 },
        { id: U.rafael.id, nome: 'Rafael Costa', perfil: 'suporte', pendentes: 2, resolvidos: 5, horasMedias: 8.8 },
        { id: U.admin.id, nome: 'Marina Alves', perfil: 'admin', pendentes: 0, resolvidos: 0, horasMedias: null },
      ]);
    });

    it('lista os 5 pendentes mais antigos e a série dos últimos 14 dias', async () => {
      const { data } = await api.req('GET', '/admin/resumo', { token: admin });
      expect(data.pendentesMaisAntigos.map((c) => c.id)).toEqual([3, 6, 2, 5, 4]);
      expect(data.porDia).toHaveLength(14);
      expect(data.porDia.reduce((s, d) => s + d.abertos, 0)).toBe(17);
      expect(data.porDia.reduce((s, d) => s + d.resolvidos, 0)).toBe(11);
    });
  });

  describe('usuários', () => {
    it('lista todos, com o total de chamados de cada um e sem senha', async () => {
      const { status, data } = await api.req('GET', '/usuarios', { token: admin });
      expect(status).toBe(200);
      expect(data).toHaveLength(7);
      expect(data.map((u) => u.nome)).toEqual([...data.map((u) => u.nome)].sort((a, b) => a.localeCompare(b)));
      expect(data.find((u) => u.id === U.lucas.id)).toMatchObject({ total_chamados: 6, ativo: true, perfil: 'comum' });
      expect(data.find((u) => u.id === U.ana.id)).toMatchObject({ ativo: false });
      data.forEach((u) => {
        expect(u).not.toHaveProperty('senha_hash');
        expect(u).not.toHaveProperty('senha');
      });
      expect((await api.req('GET', '/usuarios', { token: rafael })).status).toBe(403);
    });

    it('cria usuário já com o perfil, que consegue entrar', async () => {
      const { status, data } = await api.req('POST', '/usuarios', {
        token: admin, corpo: { nome: 'Bruno Técnico', email: 'Bruno@Empresa.com', senha: 'senha123', perfil: 'suporte' },
      });
      expect(status).toBe(201);
      expect(data).toMatchObject({ nome: 'Bruno Técnico', email: 'bruno@empresa.com', perfil: 'suporte', ativo: true, total_chamados: 0 });
      expect((await api.req('POST', '/login', { corpo: { email: 'bruno@empresa.com', senha: 'senha123' } })).status).toBe(200);
    });

    it('recusa perfil inválido, e-mail repetido e pedido de quem não é admin', async () => {
      const corpo = { nome: 'Fulano', email: 'fulano@x.com', senha: '123456' };
      expect((await api.req('POST', '/usuarios', { token: admin, corpo: { ...corpo, perfil: 'root' } })).status).toBe(400);
      expect((await api.req('POST', '/usuarios', { token: admin, corpo: { ...corpo, email: U.lucas.email } })).status).toBe(409);
      expect((await api.req('POST', '/usuarios', { token: rafael, corpo })).status).toBe(403);
    });

    it('promove um colaborador, que passa a ver a fila inteira sem novo login', async () => {
      const { status, data } = await api.req('PUT', `/usuarios/${U.lucas.id}/perfil`, { token: admin, corpo: { perfil: 'suporte' } });
      expect(status).toBe(200);
      expect(data.perfil).toBe('suporte');
      expect((await api.req('GET', '/chamados', { token: lucas })).data.total).toBe(17);
    });

    it('o admin não tira o próprio perfil de admin', async () => {
      const { status } = await api.req('PUT', `/usuarios/${U.admin.id}/perfil`, { token: admin, corpo: { perfil: 'comum' } });
      expect(status).toBe(400);
    });

    it('desativar derruba a sessão na hora; reativar devolve o acesso', async () => {
      const desativar = await api.req('PUT', `/usuarios/${U.lucas.id}/status`, { token: admin, corpo: { ativo: false } });
      expect(desativar.status).toBe(200);
      expect(desativar.data.ativo).toBe(false);

      const bloqueado = await api.req('GET', '/chamados', { token: lucas });
      expect(bloqueado.status).toBe(401);
      expect(bloqueado.data.error).toMatch(/desativada/i);

      await api.req('PUT', `/usuarios/${U.lucas.id}/status`, { token: admin, corpo: { ativo: true } });
      expect((await api.req('GET', '/chamados', { token: lucas })).status).toBe(200);
    });

    it('o admin não desativa a própria conta e "ativo" precisa ser booleano', async () => {
      expect((await api.req('PUT', `/usuarios/${U.admin.id}/status`, { token: admin, corpo: { ativo: false } })).status).toBe(400);
      expect((await api.req('PUT', `/usuarios/${U.lucas.id}/status`, { token: admin, corpo: { ativo: 'sim' } })).status).toBe(400);
      expect((await api.req('PUT', '/usuarios/999/status', { token: admin, corpo: { ativo: false } })).status).toBe(404);
    });
  });
});
