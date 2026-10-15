// Comportamentos que só existem no servidor real: HTTP, segurança e disco
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { criarClientes, USUARIOS as U } from '../apoio/clientes.mjs';

const require = createRequire(import.meta.url);
const app = require('../../src/app');
const conexao = require('../../src/database');

const [api] = await criarClientes();
let token;

beforeAll(async () => {
  await api.reiniciar();
  token = await api.entrar(U.lucas.email);
});
afterAll(() => api.encerrar());

describe('Servidor (somente API real)', () => {
  it('responde 400 com mensagem clara para JSON malformado', async () => {
    const res = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{email:');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON inválido/);
  });

  it('responde 404 em JSON para rota inexistente', async () => {
    const res = await request(app).get('/api/nao-existe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Rota não encontrada.' });
  });

  it('envia cabeçalhos de segurança (Helmet)', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('libera CORS só para o endereço do frontend', async () => {
    const permitido = await request(app).get('/api/me').set('Origin', 'http://localhost:5173');
    const outro = await request(app).get('/api/me').set('Origin', 'https://site-qualquer.com');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(outro.headers['access-control-allow-origin']).not.toBe('https://site-qualquer.com');
  });

  it('recusa token expirado ou assinado com outra chave', async () => {
    const expirado = jwt.sign({ id: U.lucas.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const falsificado = jwt.sign({ id: U.admin.id }, 'outra-chave');
    for (const t of [expirado, falsificado]) {
      const res = await request(app).get('/api/me').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(401);
    }
  });

  it('guarda a senha com hash bcrypt, nunca em texto', async () => {
    await request(app).post('/api/register').send({ nome: 'Teste Hash', email: 'hash@x.com', senha: 'minha-senha' });
    const [linha] = await conexao.query("SELECT senha_hash FROM usuarios WHERE email = 'hash@x.com'", { type: 'SELECT' });
    expect(linha.senha_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(linha.senha_hash).not.toContain('minha-senha');
  });

  it('grava o anexo no disco com nome aleatório, não com o nome enviado', async () => {
    const res = await request(app)
      .post('/api/chamados/1/anexos')
      .set('Authorization', `Bearer ${token}`)
      .attach('anexo', Buffer.from('%PDF-1.4'), { filename: '../../perigoso.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);

    const pasta = path.resolve(process.env.UPLOADS_DIR);
    const arquivos = readdirSync(pasta);
    expect(arquivos.some((a) => /^[0-9a-f]{32}\.pdf$/.test(a))).toBe(true);
    expect(arquivos.some((a) => a.includes('perigoso'))).toBe(false);
    expect(existsSync(path.resolve(pasta, '..', 'perigoso.pdf'))).toBe(false);
  });

  it('bloqueia excesso de tentativas de login por IP', async () => {
    const limiteOriginal = process.env.LIMITE_TENTATIVAS_AUTH;
    process.env.LIMITE_TENTATIVAS_AUTH = '3';
    try {
      const tentar = () => request(app)
        .post('/api/login')
        .set('X-Forwarded-For', '203.0.113.50') // IP próprio, para não afetar os outros testes
        .send({ email: U.lucas.email, senha: 'errada' });
      const status = [];
      for (let i = 0; i < 5; i += 1) status.push((await tentar()).status);
      expect(status).toEqual([401, 401, 401, 429, 429]);
    } finally {
      process.env.LIMITE_TENTATIVAS_AUTH = limiteOriginal;
    }
  });
});
