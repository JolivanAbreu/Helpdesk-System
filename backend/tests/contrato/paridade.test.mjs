// Paridade entre a API real e a demo: dados de referência (catálogo com os
// formulários, grupos e equipe) precisam sair idênticos dos dois lados.
// Os outros testes de contrato conferem regras; este confere os dados em si,
// já que o catálogo de fábrica é escrito duas vezes (backend e demo).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

describe('Paridade entre API real e demo', () => {
  const [real, demo] = clientes;
  beforeAll(() => Promise.all(clientes.map((c) => c.reiniciar())));

  const dos2Lados = (url, email = U.admin.email, params) => Promise.all(
    [real, demo].map(async (api) => (await api.req('GET', url, { token: await api.entrar(email), params })).data)
  );

  it.each([
    ['catálogo completo (com inativos e formulários)', '/categorias', { inativas: '1' }],
    ['catálogo do colaborador', '/categorias', undefined, U.lucas.email],
    ['grupos com membros', '/grupos'],
    ['equipe com grupos', '/equipe'],
  ])('%s', async (_caso, url, params, email) => {
    const [daApi, daDemo] = await dos2Lados(url, email, params);
    expect(daDemo).toEqual(daApi);
  });

  it('dados do funcionário logado', async () => {
    const [daApi, daDemo] = await dos2Lados('/me', U.juliana.email);
    expect(daDemo).toEqual(daApi);
  });

  it('respostas, contato e local dos chamados de exemplo', async () => {
    const [daApi, daDemo] = await dos2Lados('/chamados', U.rafael.email, { porPagina: 50, ordem: 'antigos' });
    const resumo = (lista) => lista.dados.map(({ id, respostas, contato, local }) => ({ id, respostas, contato, local }));
    expect(resumo(daDemo)).toEqual(resumo(daApi));
  });
});
