// Listagem de chamados: escopo por perfil, filtros, busca, ordem e paginação
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';
import { CAT, GRUPO, SUB } from '../apoio/catalogo.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

const PENDENTES = 'aberto,em andamento';
const ids = (resposta) => resposta.data.dados.map((c) => c.id);

describe.each(clientes.map((c) => [c.nome, c]))('Fila de chamados (%s)', (_nome, api) => {
  // Estes testes só leem, então os dados são preparados uma vez
  let suporte;
  let colaborador;
  beforeAll(async () => {
    await api.reiniciar();
    suporte = await api.entrar(U.rafael.email);
    colaborador = await api.entrar(U.lucas.email);
  });

  const listar = (token, params) => api.req('GET', '/chamados', { token, params });

  it('colaborador vê só os próprios chamados', async () => {
    const r = await listar(colaborador);
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(6);
    expect(r.data.dados.every((c) => c.usuario_id === U.lucas.id)).toBe(true);
    expect(r.data.contadores).toEqual({ todos: 6, pendentes: 2, resolvidos: 4, atribuidosAMim: 0, semResponsavel: 1, atrasados: 0, doMeuGrupo: 0 });
  });

  it('colaborador continua restrito mesmo filtrando por responsável', async () => {
    const r = await listar(colaborador, { responsavel: 'nenhum' });
    expect(ids(r)).toEqual([1]);
  });

  it('equipe vê todos, com contadores das abas', async () => {
    const r = await listar(suporte);
    expect(r.data.total).toBe(17);
    expect(r.data.contadores).toEqual({ todos: 17, pendentes: 6, resolvidos: 11, atribuidosAMim: 2, semResponsavel: 3, atrasados: 2, doMeuGrupo: 6 });
  });

  it('o contador "do meu grupo" segue os grupos de cada técnico', async () => {
    // Carlos: Service Desk (N1) e Sistemas (N2), que têm 3 pendentes no N1
    const carlos = await api.entrar(U.carlos.email);
    expect((await listar(carlos)).data.contadores.doMeuGrupo).toBe(3);
    // Marina (admin) não participa de nenhum grupo
    const marina = await api.entrar(U.admin.email);
    expect((await listar(marina)).data.contadores.doMeuGrupo).toBe(0);
  });

  it('inclui solicitante, responsável, grupo e categoria, sem dados sensíveis', async () => {
    const r = await listar(suporte, { busca: 'VPN' });
    const [chamado] = r.data.dados;
    expect(chamado.usuario).toEqual({ id: U.lucas.id, nome: U.lucas.nome, email: U.lucas.email, perfil: 'comum' });
    expect(chamado.responsavel).toMatchObject({ id: U.rafael.id, nome: U.rafael.nome });
    expect(chamado.grupo).toEqual({ id: GRUPO.infra, nome: 'Infraestrutura (N2)' });
    expect(chamado.categoria).toEqual({
      id: SUB.vpn, nome: 'VPN', parent_id: CAT.rede, pai: { id: CAT.rede, nome: 'Rede e internet', icone: 'rede' },
    });
  });

  it('ordena por mais recentes por padrão', async () => {
    const r = await listar(suporte, { status: PENDENTES });
    expect(ids(r)).toEqual([5, 1, 4, 2, 6, 3]);
  });

  it('ordena por urgência: prioridade e, no empate, o mais antigo primeiro', async () => {
    const r = await listar(suporte, { status: PENDENTES, ordem: 'prioridade' });
    expect(ids(r)).toEqual([5, 3, 1, 6, 2, 4]);
  });

  it('ordena pelo vencimento do prazo de solução: os mais atrasados primeiro', async () => {
    const r = await listar(suporte, { status: PENDENTES, ordem: 'prazo' });
    expect(ids(r)).toEqual([3, 6, 5, 1, 2, 4]);
  });

  it.each([
    ['prazo estourado', { sla: 'estourado' }, [6, 3]],
    ['prazo em risco', { sla: 'em_risco' }, [5]],
    ['categoria principal (inclui as subcategorias)', { categoria: String(CAT.rede) }, [2, 6, 9, 13]],
    ['duas categorias', { categoria: `${CAT.acessos},${CAT.email}` }, [7, 11, 14]],
    ['subcategoria', { categoria: String(SUB.perifericos) }, [12, 16]],
    ['categoria e subcategoria juntas', { categoria: `${CAT.email},${SUB.licencas}` }, [7, 17]],
    ['grupo', { grupo: String(GRUPO.sistemas) }, [8]],
    ['grupo, só pendentes', { grupo: String(GRUPO.infra), status: PENDENTES }, [5, 2, 6]],
    ['meus grupos', { grupo: 'meus', status: PENDENTES }, [5, 1, 4, 2, 6, 3]],
  ])('filtra por %s', async (_caso, params, esperado) => {
    expect(ids(await listar(suporte, params))).toEqual(esperado);
  });

  it('informa a situação dos dois prazos em cada chamado', async () => {
    const porId = Object.fromEntries((await listar(suporte, { porPagina: 50 })).data.dados.map((c) => [c.id, c.sla]));
    const situacoes = (id) => [porId[id].resposta.situacao, porId[id].solucao.situacao];
    expect(situacoes(1)).toEqual(['estourado', 'no_prazo']); // alta, sem resposta há 4,8 h
    expect(situacoes(3)).toEqual(['cumprido', 'estourado']);
    expect(situacoes(5)).toEqual(['cumprido', 'em_risco']); // crítica, 78% do prazo
    expect(situacoes(10)).toEqual(['cumprido', 'violado']); // média resolvida em 30 h
    expect(situacoes(13)).toEqual(['violado', 'violado']);
    expect(situacoes(17)).toEqual(['cumprido', 'cumprido']);
    expect(Date.parse(porId[17].solucao.prazo)).toBeGreaterThan(0);
  });

  it.each([
    ['status resolvido', { status: 'resolvido' }, 11],
    ['prioridade crítica e alta', { prioridade: 'critica,alta' }, 6],
    ['atribuídos a mim', { status: PENDENTES, responsavel: 'eu' }, 2],
    ['sem responsável', { status: PENDENTES, responsavel: 'nenhum' }, 3],
    ['responsável por ID', { responsavel: String(U.carlos.id) }, 7],
    ['valores inválidos são ignorados', { status: 'xyz', prioridade: 'foo', categoria: 'rede', grupo: 'abc' }, 17],
    ['sem grupo', { grupo: 'nenhum' }, 0],
  ])('filtra por %s', async (_caso, params, total) => {
    expect((await listar(suporte, params)).data.total).toBe(total);
  });

  it.each([
    ['assunto, sem diferenciar maiúsculas', 'vpn', [2]],
    ['descrição', 'ramal 2045', [6]],
    ['código CH-0005', 'CH-0005', [5]],
    ['código #8', '#8', [8]],
  ])('busca por %s', async (_caso, busca, esperado) => {
    expect(ids(await listar(suporte, { busca }))).toEqual(esperado);
  });

  it('busca ignora acentos', async () => {
    expect(ids(await listar(suporte, { busca: 'licenca do office' }))).toEqual([17]);
  });

  it('pagina os resultados', async () => {
    const r = await listar(suporte, { porPagina: 5, pagina: 2 });
    expect(r.data).toMatchObject({ total: 17, pagina: 2, porPagina: 5, totalPaginas: 4 });
    expect(ids(r)).toEqual([3, 7, 8, 9, 10]);
  });

  it('limita o tamanho da página e corrige página inválida', async () => {
    const r = await listar(suporte, { porPagina: 9999, pagina: -3 });
    expect(r.data).toMatchObject({ pagina: 1, porPagina: 50 });
  });
});
