// Cadastro, login e sessão
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

describe.each(clientes.map((c) => [c.nome, c]))('Autenticação (%s)', (_nome, api) => {
  beforeEach(() => api.reiniciar());

  describe('cadastro', () => {
    it('cria a conta sempre como colaborador, mesmo pedindo perfil admin', async () => {
      const { status, data } = await api.req('POST', '/register', {
        corpo: { nome: 'Nova Pessoa', email: 'nova@empresa.com', senha: '123456', perfil: 'admin' },
      });
      expect(status).toBe(201);
      expect(data.usuario).toMatchObject({ nome: 'Nova Pessoa', email: 'nova@empresa.com', perfil: 'comum' });
      expect(data.token).toEqual(expect.any(String));
      expect(data.usuario).not.toHaveProperty('senha_hash');
      expect(data.usuario).not.toHaveProperty('senha');
    });

    it('recusa e-mail já cadastrado, sem diferenciar maiúsculas', async () => {
      const { status } = await api.req('POST', '/register', {
        corpo: { nome: 'Outra Pessoa', email: 'USUARIO@helpdesk.com', senha: '123456' },
      });
      expect(status).toBe(409);
    });

    it.each([
      ['nome curto', { nome: 'A', email: 'a@b.com', senha: '123456' }],
      ['e-mail inválido', { nome: 'Fulano', email: 'sem-arroba', senha: '123456' }],
      ['senha curta', { nome: 'Fulano', email: 'f@b.com', senha: '123' }],
    ])('valida os campos: %s', async (_caso, corpo) => {
      const { status, data } = await api.req('POST', '/register', { corpo });
      expect(status).toBe(400);
      expect(data.error).toEqual(expect.any(String));
    });
  });

  describe('login', () => {
    it('entra com e-mail e senha corretos', async () => {
      const { status, data } = await api.req('POST', '/login', {
        corpo: { email: U.rafael.email, senha: '123456' },
      });
      expect(status).toBe(200);
      expect(data.usuario).toMatchObject({ id: U.rafael.id, perfil: 'suporte' });
    });

    it('responde igual para e-mail inexistente e senha errada', async () => {
      const inexistente = await api.req('POST', '/login', { corpo: { email: 'ninguem@x.com', senha: '123456' } });
      const senhaErrada = await api.req('POST', '/login', { corpo: { email: U.lucas.email, senha: 'errada' } });
      expect(inexistente.status).toBe(401);
      expect(senhaErrada.status).toBe(401);
      expect(inexistente.data.error).toBe(senhaErrada.data.error);
    });

    it('barra conta desativada só depois de conferir a senha', async () => {
      const certa = await api.req('POST', '/login', { corpo: { email: U.ana.email, senha: '123456' } });
      const errada = await api.req('POST', '/login', { corpo: { email: U.ana.email, senha: 'errada' } });
      expect(certa.status).toBe(403);
      expect(certa.data.error).toMatch(/desativada/i);
      expect(errada.status).toBe(401);
    });

    it('exige e-mail e senha', async () => {
      const { status } = await api.req('POST', '/login', { corpo: { email: '' } });
      expect(status).toBe(400);
    });
  });

  describe('sessão', () => {
    it('/me devolve o usuário logado', async () => {
      const token = await api.entrar(U.juliana.email);
      const { status, data } = await api.req('GET', '/me', { token });
      expect(status).toBe(200);
      expect(data).toMatchObject({ id: U.juliana.id, nome: U.juliana.nome, perfil: 'comum', ativo: true });
    });

    it('recusa requisição sem token ou com token inválido', async () => {
      expect((await api.req('GET', '/chamados')).status).toBe(401);
      expect((await api.req('GET', '/chamados', { token: 'invalido' })).status).toBe(401);
    });
  });
});
