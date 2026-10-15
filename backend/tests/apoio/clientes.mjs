// tests/apoio/clientes.mjs
// Dois "clientes" com a mesma interface: um conversa com a API real
// (Express + MariaDB, via Supertest) e o outro com a API simulada da
// demonstração publicada na Vercel (frontend/src/demo).
//
// Os testes de contrato rodam iguais nos dois. Se uma regra mudar só em
// um lado, o teste acusa a diferença.
import { createRequire } from 'node:module';
import request from 'supertest';

const require = createRequire(import.meta.url);

const SENHA_PADRAO = '123456';

/* ----------------------------- API real ----------------------------- */

function criarClienteReal() {
  const app = require('../../src/app');
  const conexao = require('../../src/database');
  const Sequelize = require('sequelize');
  const seeder = require('../../src/database/seeders/20251005220000-demo-data');

  return {
    nome: 'API real',

    // Volta o banco de teste ao estado dos dados de exemplo, com os IDs desde 1
    async reiniciar() {
      for (const tabela of ['anexos', 'interacoes', 'chamados', 'usuarios']) {
        await conexao.query(`DELETE FROM ${tabela}`);
        await conexao.query(`ALTER TABLE ${tabela} AUTO_INCREMENT = 1`);
      }
      await seeder.up(conexao.getQueryInterface(), Sequelize);
    },

    async req(metodo, url, { token, corpo, params } = {}) {
      let r = request(app)[metodo.toLowerCase()](`/api${url}`);
      if (token) r = r.set('Authorization', `Bearer ${token}`);
      if (params) r = r.query(params);
      if (corpo !== undefined) r = r.send(corpo);
      const res = await r;
      return { status: res.status, data: res.body };
    },

    async enviarArquivo(url, token, { nome, tipo, conteudo }) {
      const res = await request(app)
        .post(`/api${url}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('anexo', conteudo, { filename: nome, contentType: tipo });
      return { status: res.status, data: res.body };
    },

    async baixar(url, token) {
      const res = await request(app)
        .get(`/api${url}`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse((resposta, fim) => {
          const partes = [];
          resposta.on('data', (p) => partes.push(p));
          resposta.on('end', () => fim(null, Buffer.concat(partes)));
        });
      return { status: res.status, conteudo: res.status === 200 ? res.body : null };
    },

    async encerrar() {
      await conexao.close();
    },
  };
}

/* --------------------------- API da demo --------------------------- */

async function criarClienteDemo() {
  const { default: adaptador } = await import('../../../frontend/src/demo/adaptador.js');
  const { restaurarDadosDeExemplo } = await import('../../../frontend/src/demo/banco.js');

  // Chama o adaptador como o axios chamaria, e devolve status + corpo
  async function chamar(config) {
    try {
      const resposta = await adaptador({ headers: {}, ...config });
      return resposta;
    } catch (erro) {
      if (erro.response) return erro.response;
      throw erro;
    }
  }

  const cabecalhos = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

  return {
    nome: 'API da demo',

    async reiniciar() {
      restaurarDadosDeExemplo();
    },

    async req(metodo, url, { token, corpo, params } = {}) {
      const res = await chamar({
        method: metodo.toLowerCase(),
        url,
        params,
        headers: cabecalhos(token),
        data: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      return { status: res.status, data: res.data };
    },

    async enviarArquivo(url, token, { nome, tipo, conteudo }) {
      const formulario = new FormData();
      formulario.append('anexo', new File([conteudo], nome, { type: tipo }));
      const res = await chamar({ method: 'post', url, headers: cabecalhos(token), data: formulario });
      return { status: res.status, data: res.data };
    },

    async baixar(url, token) {
      const res = await chamar({ method: 'get', url, headers: cabecalhos(token), responseType: 'blob' });
      const conteudo = res.status === 200 ? Buffer.from(await res.data.arrayBuffer()) : null;
      return { status: res.status, conteudo };
    },

    async encerrar() {},
  };
}

/* ------------------------------ Apoio ------------------------------ */

// Acrescenta o login com cache de tokens (os IDs dos usuários de exemplo
// não mudam entre reinícios, então o token continua válido)
function comLogin(cliente) {
  const tokens = new Map();
  return Object.assign(cliente, {
    async entrar(email, senha = SENHA_PADRAO) {
      const chave = `${email}:${senha}`;
      if (!tokens.has(chave)) {
        const { status, data } = await cliente.req('POST', '/login', { corpo: { email, senha } });
        if (status !== 200) throw new Error(`Login de ${email} falhou (${status}): ${data?.error}`);
        tokens.set(chave, data.token);
      }
      return tokens.get(chave);
    },
    esquecerTokens() {
      tokens.clear();
    },
  });
}

export async function criarClientes() {
  return [comLogin(criarClienteReal()), comLogin(await criarClienteDemo())];
}

// Usuários dos dados de exemplo (mesmos IDs no seeder e na demo)
export const USUARIOS = {
  admin: { id: 1, email: 'admin@helpdesk.com', nome: 'Marina Alves' },
  rafael: { id: 2, email: 'suporte@helpdesk.com', nome: 'Rafael Costa' },
  carlos: { id: 3, email: 'carlos@helpdesk.com', nome: 'Carlos Lima' },
  lucas: { id: 4, email: 'usuario@helpdesk.com', nome: 'Lucas Pereira' },
  juliana: { id: 5, email: 'juliana@helpdesk.com', nome: 'Juliana Rocha' },
  pedro: { id: 6, email: 'pedro@helpdesk.com', nome: 'Pedro Santos' },
  ana: { id: 7, email: 'ana@helpdesk.com', nome: 'Ana Souza' },
};
