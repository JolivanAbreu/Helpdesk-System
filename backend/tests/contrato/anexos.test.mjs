// Envio e download de anexos
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

const clientes = await criarClientes();
afterAll(() => Promise.all(clientes.map((c) => c.encerrar())));

const PDF = { nome: 'Relatório de erro.pdf', tipo: 'application/pdf', conteudo: Buffer.from('%PDF-1.4 conteúdo de teste') };

describe.each(clientes.map((c) => [c.nome, c]))('Anexos (%s)', (_nome, api) => {
  let lucas; let juliana; let rafael;
  beforeEach(async () => {
    await api.reiniciar();
    [lucas, juliana, rafael] = await Promise.all([U.lucas, U.juliana, U.rafael].map((u) => api.entrar(u.email)));
  });

  it('o solicitante envia e a equipe baixa o arquivo intacto, com o nome original', async () => {
    const envio = await api.enviarArquivo('/chamados/1/anexos', lucas, PDF);
    expect(envio.status).toBe(201);
    expect(envio.data).toMatchObject({ id: expect.any(Number), nome_original: 'Relatório de erro.pdf' });
    expect(envio.data).not.toHaveProperty('nome_arquivo');

    const { data: chamado } = await api.req('GET', '/chamados/1', { token: rafael });
    expect(chamado.anexos.map((a) => a.nome_original)).toEqual(['Relatório de erro.pdf']);

    const download = await api.baixar(`/chamados/1/anexos/${envio.data.id}`, rafael);
    expect(download.status).toBe(200);
    expect(download.conteudo.equals(PDF.conteudo)).toBe(true);
  });

  it('quem não tem acesso ao chamado não envia nem baixa', async () => {
    const { data } = await api.enviarArquivo('/chamados/1/anexos', lucas, PDF);
    expect((await api.enviarArquivo('/chamados/1/anexos', juliana, PDF)).status).toBe(403);
    expect((await api.baixar(`/chamados/1/anexos/${data.id}`, juliana)).status).toBe(403);
  });

  it('não entrega o anexo por meio de outro chamado', async () => {
    const { data } = await api.enviarArquivo('/chamados/1/anexos', lucas, PDF);
    expect((await api.baixar(`/chamados/2/anexos/${data.id}`, lucas)).status).toBe(404);
  });

  it('recusa tipos de arquivo não permitidos', async () => {
    const exe = { nome: 'programa.exe', tipo: 'application/x-msdownload', conteudo: Buffer.from('MZ') };
    const { status, data } = await api.enviarArquivo('/chamados/1/anexos', lucas, exe);
    expect(status).toBe(400);
    expect(data.error).toMatch(/tipo de arquivo/i);
  });

  it('recusa arquivos acima do limite', async () => {
    const grande = { ...PDF, conteudo: Buffer.alloc(11 * 1024 * 1024) };
    expect((await api.enviarArquivo('/chamados/1/anexos', lucas, grande)).status).toBe(400);
  });
});
