// src/hooks/useCatalogo.js
// Catálogo de categorias e grupos técnicos, compartilhados entre as telas.
// A primeira tela que pede busca na API; as outras reaproveitam a mesma
// resposta. Depois de editar o catálogo ou os grupos, `recarregar()`
// atualiza todas as telas abertas.
import { useCallback, useEffect, useState } from "react";
import api, { TOKEN_KEY } from "../services/api";

// Chave: token + url, para que outra conta no mesmo navegador nunca
// reaproveite dados de quem saiu
const caches = new Map(); // chave -> { url, promessa, dados, ouvintes }

function chaveDe(url) {
  let token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch { /* sem localStorage */ }
  return `${token}|${url}`;
}

function entrada(url) {
  const chave = chaveDe(url);
  if (!caches.has(chave)) caches.set(chave, { url, promessa: null, dados: null, ouvintes: new Set() });
  return caches.get(chave);
}

function buscar(url, forcar = false) {
  const e = entrada(url);
  if (!e.promessa || forcar) {
    e.promessa = api.get(url).then(({ data }) => {
      e.dados = data;
      e.ouvintes.forEach((avisar) => avisar(data));
      return data;
    }).catch((erro) => {
      e.promessa = null;
      throw erro;
    });
  }
  return e.promessa;
}

function useRecurso(url, ativo = true) {
  const [dados, setDados] = useState(() => (ativo ? entrada(url).dados : null));
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!ativo) return undefined;
    const e = entrada(url);
    e.ouvintes.add(setDados);
    buscar(url).then(setDados).catch(() => setErro(true));
    return () => e.ouvintes.delete(setDados);
  }, [url, ativo]);

  const recarregar = useCallback(() => {
    // Atualiza também as outras variações (com e sem inativos)
    const base = url.split("?")[0];
    const prefixo = chaveDe("");
    [...caches.entries()]
      .filter(([chave, e]) => chave.startsWith(prefixo) && e.url !== url && e.url.split("?")[0] === base)
      .forEach(([, e]) => buscar(e.url, true).catch(() => {}));
    return buscar(url, true);
  }, [url]);

  return { dados, carregando: ativo && !dados && !erro, erro, recarregar };
}

// Árvore do catálogo. `inativas`: inclui itens desativados (só admin)
export function useCatalogo({ inativas = false } = {}) {
  const { dados, ...resto } = useRecurso(inativas ? "/categorias?inativas=1" : "/categorias");
  return { catalogo: dados || [], ...resto };
}

// Grupos técnicos (somente equipe)
export function useGrupos(ativo = true) {
  const { dados, ...resto } = useRecurso("/grupos", ativo);
  return { grupos: dados || [], ...resto };
}

// Técnicos ativos, com os grupos de cada um (somente equipe)
export function useEquipe(ativo = true) {
  const { dados, ...resto } = useRecurso("/equipe", ativo);
  return { equipe: dados || [], ...resto };
}

// Subcategoria pelo ID, com a categoria principal em `pai`
export function acharSubcategoria(catalogo, id) {
  for (const pai of catalogo) {
    const sub = pai.subcategorias.find((s) => s.id === id);
    if (sub) return { ...sub, pai };
  }
  return null;
}
