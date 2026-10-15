// Catálogo de categorias (com prioridade, prazos e grupo de cada
// subcategoria) e grupos técnicos com seus membros
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';
import { CAT, GRUPO, SUB } from '../apoio/catalogo.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

describe.each(clientes.map((c) => [c.nome, c]))('Catálogo e grupos (%s)', (_nome, api) => {
  let admin; let rafael; let lucas;
  beforeEach(async () => {
    await api.reiniciar();
    api.esquecerTokens();
    [admin, rafael, lucas] = await Promise.all([U.admin, U.rafael, U.lucas].map((u) => api.entrar(u.email)));
  });

  const catalogo = async (token = lucas, params) => (await api.req('GET', '/categorias', { token, params })).data;
  const sub = (arvore, id) => arvore.flatMap((c) => c.subcategorias).find((s) => s.id === id);

  describe('catálogo', () => {
    it('todos os usuários leem a árvore, em ordem alfabética com "Outros" no fim', async () => {
      const arvore = await catalogo();
      expect(arvore.map((c) => c.nome)).toEqual([
        'Acessos e senhas', 'E-mail', 'Hardware', 'Rede e internet', 'Software e sistemas', 'Outros',
      ]);
      expect(arvore.find((c) => c.id === CAT.hardware).subcategorias.map((s) => s.nome)).toEqual([
        'Computador ou notebook', 'Impressora', 'Monitor e vídeo', 'Teclado, mouse e webcam', 'Outros',
      ]);
      expect(arvore.flatMap((c) => c.subcategorias)).toHaveLength(23);
    });

    it('cada subcategoria traz prioridade, prazos em horas e grupo', async () => {
      const arvore = await catalogo();
      expect(arvore.find((c) => c.id === CAT.hardware)).toMatchObject({
        nome: 'Hardware', icone: 'hardware', parent_id: null, grupo: { id: GRUPO.n1, nome: 'Service Desk (N1)' }, ativo: true,
      });
      expect(sub(arvore, SUB.sistemaForaDoAr)).toMatchObject({
        nome: 'Sistema fora do ar', parent_id: CAT.software, prioridade: 'critica',
        sla_resposta_horas: 1, sla_solucao_horas: 4, grupo_id: GRUPO.sistemas, grupo: { id: GRUPO.sistemas, nome: 'Sistemas (N2)' },
      });
      expect(sub(arvore, SUB.redefinirSenha)).toMatchObject({ prioridade: 'alta', sla_resposta_horas: 0.5, sla_solucao_horas: 2 });
      expect(sub(arvore, SUB.wifi)).toMatchObject({ prioridade: 'baixa', sla_resposta_horas: 8, sla_solucao_horas: 72, grupo_id: GRUPO.infra });
    });

    it('itens desativados somem do catálogo; o admin pode pedir para vê-los', async () => {
      await api.req('PUT', `/categorias/${SUB.wifi}`, { token: admin, corpo: { ativo: false } });
      await api.req('PUT', `/categorias/${CAT.email}`, { token: admin, corpo: { ativo: false } });

      const visivel = await catalogo();
      expect(sub(visivel, SUB.wifi)).toBeUndefined();
      expect(visivel.some((c) => c.id === CAT.email)).toBe(false);

      const completo = await catalogo(admin, { inativas: '1' });
      expect(sub(completo, SUB.wifi)).toMatchObject({ ativo: false });
      expect(completo.find((c) => c.id === CAT.email)).toMatchObject({ ativo: false });

      // Só o admin vê os inativos, mesmo pedindo
      expect(sub(await catalogo(rafael, { inativas: '1' }), SUB.wifi)).toBeUndefined();
    });

    it('chamado não pode ser aberto em subcategoria de categoria desativada', async () => {
      await api.req('PUT', `/categorias/${CAT.email}`, { token: admin, corpo: { ativo: false } });
      const { status } = await api.req('POST', '/chamados', {
        token: lucas, corpo: { titulo: 'Outlook travando', descricao: 'x', categoria_id: SUB.configEmail },
      });
      expect(status).toBe(400);
    });

    it('o admin cria uma subcategoria; sem prazos, valem as metas da prioridade e o grupo da categoria', async () => {
      const { status, data } = await api.req('POST', '/categorias', {
        token: admin, corpo: { nome: '  Scanner  ', parent_id: CAT.hardware, prioridade: 'media' },
      });
      expect(status).toBe(201);
      expect(data).toMatchObject({
        nome: 'Scanner', parent_id: CAT.hardware, prioridade: 'media',
        sla_resposta_horas: 4, sla_solucao_horas: 24, grupo_id: GRUPO.n1, ativo: true, icone: null,
      });
      expect(data.id).toBe(30);

      const chamado = await api.req('POST', '/chamados', { token: lucas, corpo: { titulo: 'Scanner travou', descricao: 'x', categoria_id: data.id } });
      expect(chamado.data).toMatchObject({ prioridade: 'media', grupo_id: GRUPO.n1 });
    });

    it('o admin cria uma categoria principal com ícone', async () => {
      const { status, data } = await api.req('POST', '/categorias', {
        token: admin, corpo: { nome: 'Telefonia móvel', icone: 'rede', grupo_id: GRUPO.infra },
      });
      expect(status).toBe(201);
      expect(data).toMatchObject({ nome: 'Telefonia móvel', parent_id: null, icone: 'rede', grupo_id: GRUPO.infra, prioridade: null });
    });

    it('o admin edita prioridade, prazos e grupo de uma subcategoria', async () => {
      const { status, data } = await api.req('PUT', `/categorias/${SUB.vpn}`, {
        token: admin, corpo: { prioridade: 'alta', sla_resposta_horas: 1.5, sla_solucao_horas: 6, grupo_id: GRUPO.n1, descricao: 'Acesso remoto' },
      });
      expect(status).toBe(200);
      expect(data).toMatchObject({
        nome: 'VPN', prioridade: 'alta', sla_resposta_horas: 1.5, sla_solucao_horas: 6, grupo_id: GRUPO.n1, descricao: 'Acesso remoto',
      });
    });

    it.each([
      ['nome curto', 'POST', { nome: 'A', parent_id: CAT.hardware, prioridade: 'media' }, 400],
      ['prioridade inválida', 'POST', { nome: 'Scanner', parent_id: CAT.hardware, prioridade: 'urgente' }, 400],
      ['subcategoria sem prioridade', 'POST', { nome: 'Scanner', parent_id: CAT.hardware }, 400],
      ['pai que é subcategoria', 'POST', { nome: 'Scanner', parent_id: SUB.impressora, prioridade: 'media' }, 400],
      ['pai inexistente', 'POST', { nome: 'Scanner', parent_id: 999, prioridade: 'media' }, 400],
      ['ícone inválido', 'POST', { nome: 'Nova', icone: 'foguete' }, 400],
      ['grupo inexistente', 'POST', { nome: 'Nova', grupo_id: 999 }, 400],
      ['nome repetido no mesmo nível (sem diferenciar maiúsculas)', 'POST', { nome: 'impressora', parent_id: CAT.hardware, prioridade: 'media' }, 409],
      ['prazo zero', 'PUT', { sla_resposta_horas: 0 }, 400],
      ['prazo em texto', 'PUT', { sla_solucao_horas: '8' }, 400],
      ['prazo absurdo', 'PUT', { sla_solucao_horas: 5000 }, 400],
      ['resposta maior que a solução', 'PUT', { sla_resposta_horas: 10, sla_solucao_horas: 8 }, 400],
      ['ativo em texto', 'PUT', { ativo: 'sim' }, 400],
      ['renomear para um nome já usado', 'PUT', { nome: 'Monitor e vídeo' }, 409],
    ])('recusa %s', async (_caso, metodo, corpo, esperado) => {
      const url = metodo === 'POST' ? '/categorias' : `/categorias/${SUB.impressora}`;
      expect((await api.req(metodo, url, { token: admin, corpo })).status).toBe(esperado);
    });

    it('o mesmo nome pode existir em categorias diferentes', async () => {
      const { status } = await api.req('POST', '/categorias', {
        token: admin, corpo: { nome: 'Impressora', parent_id: CAT.software, prioridade: 'baixa' },
      });
      expect(status).toBe(201);
    });

    it('responde 404 para categoria inexistente e só o admin edita', async () => {
      expect((await api.req('PUT', '/categorias/999', { token: admin, corpo: { ativo: false } })).status).toBe(404);
      expect((await api.req('PUT', `/categorias/${SUB.vpn}`, { token: rafael, corpo: { ativo: false } })).status).toBe(403);
      expect((await api.req('POST', '/categorias', { token: lucas, corpo: { nome: 'Nova' } })).status).toBe(403);
    });
  });

  describe('grupos', () => {
    const grupos = async (token = rafael) => (await api.req('GET', '/grupos', { token })).data;

    it('a equipe vê os grupos, com membros e fila pendente', async () => {
      const lista = await grupos();
      expect(lista.map((g) => [g.id, g.nome, g.pendentes, g.membros.map((m) => m.nome)])).toEqual([
        [GRUPO.n1, 'Service Desk (N1)', 3, ['Carlos Lima', 'Rafael Costa']],
        [GRUPO.infra, 'Infraestrutura (N2)', 3, ['Rafael Costa']],
        [GRUPO.sistemas, 'Sistemas (N2)', 0, ['Carlos Lima']],
      ]);
      expect(lista[0].membros[0]).toEqual({ id: U.carlos.id, nome: 'Carlos Lima', email: U.carlos.email, perfil: 'suporte', ativo: true });
      expect((await api.req('GET', '/grupos', { token: lucas })).status).toBe(403);
    });

    it('o admin cria um grupo com membros', async () => {
      const { status, data } = await api.req('POST', '/grupos', {
        token: admin, corpo: { nome: 'Field Service', descricao: 'Atendimento presencial', membros: [U.carlos.id, U.admin.id, U.carlos.id] },
      });
      expect(status).toBe(201);
      expect(data).toMatchObject({ id: 4, nome: 'Field Service', descricao: 'Atendimento presencial', ativo: true });
      expect(data.membros.map((m) => m.nome)).toEqual(['Carlos Lima', 'Marina Alves']);
    });

    it('o admin troca os membros e o técnico passa a ver o grupo na equipe', async () => {
      const { status, data } = await api.req('PUT', `/grupos/${GRUPO.sistemas}`, { token: admin, corpo: { membros: [U.rafael.id] } });
      expect(status).toBe(200);
      expect(data.membros.map((m) => m.nome)).toEqual(['Rafael Costa']);

      const equipe = (await api.req('GET', '/equipe', { token: rafael })).data;
      expect(equipe.find((m) => m.id === U.rafael.id).grupos.map((g) => g.id)).toEqual([GRUPO.n1, GRUPO.infra, GRUPO.sistemas]);
      expect(equipe.find((m) => m.id === U.carlos.id).grupos.map((g) => g.id)).toEqual([GRUPO.n1]);
    });

    it('o admin renomeia e desativa; grupo desativado sai da lista de grupos de cada técnico', async () => {
      const { data } = await api.req('PUT', `/grupos/${GRUPO.sistemas}`, { token: admin, corpo: { nome: 'ERP (N2)', ativo: false } });
      expect(data).toMatchObject({ nome: 'ERP (N2)', ativo: false });
      const equipe = (await api.req('GET', '/equipe', { token: rafael })).data;
      expect(equipe.find((m) => m.id === U.carlos.id).grupos.map((g) => g.id)).toEqual([GRUPO.n1]);
    });

    it('quem deixa a equipe sai dos grupos', async () => {
      await api.req('PUT', `/usuarios/${U.carlos.id}/perfil`, { token: admin, corpo: { perfil: 'comum' } });
      const lista = await grupos();
      expect(lista.find((g) => g.id === GRUPO.n1).membros.map((m) => m.nome)).toEqual(['Rafael Costa']);
      expect(lista.find((g) => g.id === GRUPO.sistemas).membros).toEqual([]);
    });

    it.each([
      ['nome curto', 'POST', { nome: 'X' }, 400],
      ['nome repetido (sem diferenciar maiúsculas)', 'POST', { nome: 'service desk (n1)' }, 409],
      ['membros fora de lista', 'POST', { nome: 'Novo grupo', membros: 3 }, 400],
      ['colaborador como membro', 'POST', { nome: 'Novo grupo', membros: [U.lucas.id] }, 400],
      ['membro inexistente', 'POST', { nome: 'Novo grupo', membros: [999] }, 400],
      ['ativo em texto', 'PUT', { ativo: 'não' }, 400],
      ['renomear para um nome já usado', 'PUT', { nome: 'Sistemas (N2)' }, 409],
    ])('recusa %s', async (_caso, metodo, corpo, esperado) => {
      const url = metodo === 'POST' ? '/grupos' : `/grupos/${GRUPO.infra}`;
      expect((await api.req(metodo, url, { token: admin, corpo })).status).toBe(esperado);
    });

    it('responde 404 para grupo inexistente e só o admin altera', async () => {
      expect((await api.req('PUT', '/grupos/999', { token: admin, corpo: { ativo: false } })).status).toBe(404);
      expect((await api.req('PUT', `/grupos/${GRUPO.n1}`, { token: rafael, corpo: { ativo: false } })).status).toBe(403);
      expect((await api.req('POST', '/grupos', { token: rafael, corpo: { nome: 'Meu grupo' } })).status).toBe(403);
    });
  });
});
