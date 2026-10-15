// Testes da busca inteligente, com o catálogo de fábrica (o mesmo da API)
import { describe, it, expect } from "vitest";
import { catalogoInicial } from "../demo/catalogo";
import {
  normalizar, termos, semelhanca, criarIndice, buscar, sugerirTitulos, modeloDescricao,
} from "./buscaCatalogo";

// Árvore no formato de GET /categorias
function arvore() {
  const { categorias } = catalogoInicial(new Date().toISOString());
  return categorias
    .filter((c) => c.parent_id === null)
    .map((pai) => ({ ...pai, subcategorias: categorias.filter((s) => s.parent_id === pai.id) }));
}

const caminho = (r) => `${r.pai.nome} › ${r.sub.nome}`;
const primeiro = (consulta, catalogo = arvore()) => {
  const [r] = buscar(criarIndice(catalogo), consulta);
  return r ? caminho(r) : null;
};

describe("normalização", () => {
  it("tira acentos, maiúsculas, pontuação e junta palavras com hífen", () => {
    expect(normalizar("  Não IMPRIME!! E-mail / Wi-Fi ")).toBe("nao imprime email wifi");
  });

  it("descarta palavras vazias", () => {
    expect(termos("Meu computador não liga de jeito nenhum")).toEqual(["computador", "liga", "jeito", "nenhum"]);
  });

  it("reconhece começo de palavra, plural e erro de digitação", () => {
    expect(semelhanca("impre", "impressora")).toBeGreaterThan(0.8);
    expect(semelhanca("impressoras", "impressora")).toBeGreaterThan(0.7);
    expect(semelhanca("impresora", "impressora")).toBeGreaterThan(0.6);
    expect(semelhanca("sena", "senha")).toBeGreaterThan(0.6);
    expect(semelhanca("mouse", "monitor")).toBe(0);
  });
});

describe("busca no catálogo", () => {
  it.each([
    ["impressora atolando papel", "Hardware › Impressora"],
    ["impresora atolada", "Hardware › Impressora"],
    ["acabou o toner", "Hardware › Impressora"],
    ["esqueci minha senha", "Acessos e senhas › Redefinir senha"],
    ["conta bloqueada", "Acessos e senhas › Redefinir senha"],
    ["esqueci a senha do sistema", "Acessos e senhas › Redefinir senha"],
    ["liberar acesso ao sistema de ponto", "Acessos e senhas › Permissão em pasta ou sistema"],
    ["sistema de ponto não abre", "Software e sistemas › Sistema fora do ar"],
    ["ERP fora do ar", "Software e sistemas › Sistema fora do ar"],
    ["pc não liga", "Hardware › Computador ou notebook"],
    ["computador muito lento", "Hardware › Computador ou notebook"],
    ["net caindo toda hora", "Rede e internet › Lentidão ou queda de rede"],
    ["outlook não sincroniza no celular", "E-mail › Configuração de e-mail"],
    ["recebi um email suspeito", "Software e sistemas › Antivírus e segurança"],
    ["senha do wi-fi de visitantes", "Rede e internet › Wi-Fi"],
    ["não conecto na vpn de casa", "Rede e internet › VPN"],
    ["instalar power bi", "Software e sistemas › Instalação de programa"],
    ["licença do office expirada", "Software e sistemas › Licenças"],
    ["ramal mudo", "Rede e internet › Telefone IP"],
    ["acesso à pasta do financeiro", "Acessos e senhas › Permissão em pasta ou sistema"],
    ["novo colaborador começa segunda", "Acessos e senhas › Criar ou desativar usuário"],
    ["headset sem som", "Hardware › Teclado, mouse e webcam"],
    ["recuperar arquivo apagado", "Software e sistemas › Backup e servidores"],
  ])('"%s" leva a %s', (consulta, esperado) => {
    expect(primeiro(consulta)).toBe(esperado);
  });

  it("devolve no máximo 5 resultados, do mais provável para o menos", () => {
    const resultados = buscar(criarIndice(arvore()), "senha");
    expect(resultados.length).toBeLessThanOrEqual(5);
    expect(caminho(resultados[0])).toBe("Acessos e senhas › Redefinir senha");
    const pontos = resultados.map((r) => r.pontos);
    expect(pontos).toEqual([...pontos].sort((a, b) => b - a));
  });

  it("informa quais termos do catálogo combinaram", () => {
    const [r] = buscar(criarIndice(arvore()), "impresora");
    expect(r.encontrados).toContain("impressora");
  });

  it("não devolve nada para busca vazia, só com palavras vazias ou sem relação", () => {
    const indice = criarIndice(arvore());
    expect(buscar(indice, "")).toEqual([]);
    expect(buscar(indice, "de o a meu")).toEqual([]);
    expect(buscar(indice, "xyzqwk")).toEqual([]);
  });

  it("ignora subcategorias e categorias desativadas", () => {
    const catalogo = arvore().map((pai) => ({
      ...pai,
      ativo: pai.nome !== "E-mail",
      subcategorias: pai.subcategorias.map((s) => ({ ...s, ativo: s.nome !== "Impressora" })),
    }));
    expect(primeiro("impressora", catalogo)).not.toBe("Hardware › Impressora");
    expect(primeiro("outlook não sincroniza", catalogo)).not.toBe("E-mail › Configuração de e-mail");
  });
});

describe("sugestões", () => {
  const impressora = () => arvore().flatMap((p) => p.subcategorias).find((s) => s.nome === "Impressora");

  it("monta um título a partir das respostas do formulário", () => {
    const sugestoes = sugerirTitulos(impressora(), { qual_impressora: "HP do 2º andar", problema: "Atolando papel" });
    expect(sugestoes[0]).toBe("Impressora: atolando papel (HP do 2º andar)");
    expect(sugestoes).toContain("Impressora não imprime");
    expect(sugestoes.length).toBeLessThanOrEqual(4);
  });

  it("põe primeiro as sugestões parecidas com o que já foi digitado e esconde a igual", () => {
    expect(sugerirTitulos(impressora(), {}, "toner")[0]).toBe("Toner da impressora acabou");
    expect(sugerirTitulos(impressora(), {}, "impressora não imprime")).not.toContain("Impressora não imprime");
  });

  it("usa o modelo de descrição da subcategoria ou o genérico", () => {
    expect(modeloDescricao(impressora())).toMatch(/^O que aconteceu:/);
    expect(modeloDescricao({ modelo_descricao: "Erro:" })).toBe("Erro:");
  });
});
