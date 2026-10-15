// tests/setup/global.mjs
// Roda uma vez antes de toda a suíte: cria o banco de teste (separado do
// banco de desenvolvimento) e aplica as migrations do zero.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mariadb from 'mariadb';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function setup() {
  dotenv.config({ path: path.join(raiz, '.env.test'), quiet: true });
  const { DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_ROOT_PASSWORD } = process.env;

  if (!/test/.test(DB_NAME)) {
    throw new Error(`Por segurança, os testes só rodam em um banco com "test" no nome (atual: ${DB_NAME}).`);
  }

  // Cria o banco de teste com o usuário root e libera o acesso ao usuário da aplicação
  let conexao;
  try {
    conexao = await mariadb.createConnection({
      host: DB_HOST, port: Number(DB_PORT), user: 'root', password: DB_ROOT_PASSWORD,
    });
  } catch (erro) {
    throw new Error(
      `Não foi possível conectar ao MariaDB como root em ${DB_HOST}:${DB_PORT}. ` +
      `O banco está de pé (docker compose up -d)? Detalhe: ${erro.message}`
    );
  }
  try {
    await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    const hosts = await conexao.query('SELECT Host AS host FROM mysql.user WHERE User = ?', [DB_USER]);
    for (const { host } of hosts) {
      await conexao.query(`GRANT ALL ON \`${DB_NAME}\`.* TO ?@?`, [DB_USER, host]);
    }
  } finally {
    await conexao.end();
  }

  // Recria as tabelas do zero com as migrations do projeto
  const opcoes = { cwd: raiz, env: process.env, stdio: 'pipe' };
  execSync('npx sequelize-cli db:migrate:undo:all', opcoes);
  execSync('npx sequelize-cli db:migrate', opcoes);
}

export function teardown() {
  rmSync(path.join(raiz, process.env.UPLOADS_DIR || 'tmp/uploads-test'), { recursive: true, force: true });
}
