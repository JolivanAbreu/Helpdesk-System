// tests/setup/ambiente.mjs
// Roda antes de cada arquivo de teste.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(raiz, '.env.test'), quiet: true });

// A API simulada da demo roda no navegador. Para testá-la no Node,
// fornecemos as duas APIs de navegador que ela usa e o Node não tem.

class ArmazenamentoEmMemoria {
  #dados = new Map();
  getItem(chave) { return this.#dados.has(chave) ? this.#dados.get(chave) : null; }
  setItem(chave, valor) { this.#dados.set(chave, String(valor)); }
  removeItem(chave) { this.#dados.delete(chave); }
  clear() { this.#dados.clear(); }
}
globalThis.localStorage ??= new ArmazenamentoEmMemoria();

globalThis.FileReader ??= class FileReader {
  readAsDataURL(arquivo) {
    arquivo.arrayBuffer().then((buffer) => {
      this.result = `data:${arquivo.type};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload?.();
    }, (erro) => {
      this.error = erro;
      this.onerror?.();
    });
  }
};
