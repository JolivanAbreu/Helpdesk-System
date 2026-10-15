// src/utils/buscaCatalogo.js
// Busca inteligente no catálogo de serviços: a pessoa descreve o problema
// com as próprias palavras ("impresora atolando", "esqueci a senha do pc")
// e recebe as subcategorias mais prováveis.
//
// - ignora maiúsculas, acentos e hífens ("E-mail" = "email")
// - descarta palavras vazias ("de", "o", "meu", "não"...)
// - entende sinônimos comuns ("pc" = computador, "net" = internet)
// - tolera erro de digitação (1 letra até 6 letras; 2 letras a partir de 7)
// - aceita começo de palavra ("impre" encontra "impressora")
// - dá peso diferente a cada lugar: nome da subcategoria, palavras-chave,
//   sugestões de título, categoria principal, descrições e as perguntas e
//   opções do formulário
// - frases inteiras das palavras-chave ("fora do ar") valem um bônus
//
// Tudo roda no navegador: o catálogo é pequeno e já vem da API.

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "e", "ou", "para", "pra", "pro", "por", "com", "sem", "meu", "minha", "meus", "minhas", "que", "nao", "esta",
  "estou", "ta", "to", "ao", "aos", "se", "me", "eu", "ele", "ela", "foi", "ser", "muito", "mais", "ja", "agora",
  "quando", "como", "preciso", "favor", "ajuda", "problema", "consigo", "conseguindo", "fica", "ficou",
]);

// termo digitado -> termos equivalentes do catálogo
const SINONIMOS = {
  pc: ["computador"], micro: ["computador"], maquina: ["computador"], desktop: ["computador"],
  note: ["notebook"], laptop: ["notebook"],
  net: ["internet"], conexao: ["internet", "rede"], wireless: ["wifi"],
  mail: ["email"], correio: ["email"], outlook: ["email"],
  printer: ["impressora"], imprime: ["impressora", "imprimir"], imprimindo: ["impressora"], impressao: ["impressora"],
  tela: ["monitor"], display: ["monitor"],
  travou: ["travando"], travado: ["travando"], trava: ["travando"],
  lenta: ["lento"], lentidao: ["lento"], devagar: ["lento"],
  bloqueio: ["bloqueado"], bloqueou: ["bloqueado"], travada: ["bloqueado"],
  esqueci: ["senha"], password: ["senha"], acessar: ["acesso", "login"], entrar: ["login", "acesso"],
  caiu: ["fora", "queda"], parou: ["fora", "nao liga"], indisponivel: ["fora"],
  virus: ["antivirus"], hackeado: ["invasao"], golpe: ["phishing"],
  fone: ["headset"], camera: ["webcam"],
  instalar: ["instalacao"], baixar: ["instalacao"],
  ramal: ["telefone"], ligacao: ["telefone"],
  planilha: ["excel"], documento: ["word"],
};

// Minúsculas, sem acentos e sem pontuação; hífen junta a palavra ("wi-fi" -> "wifi")
export function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\w)-(\w)/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function termos(texto) {
  return normalizar(texto).split(" ").filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// Distância de edição (Levenshtein), com saída antecipada acima do limite
function distancia(a, b, limite) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j += 1) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      menor = Math.min(menor, atual[j]);
    }
    if (menor > limite) return limite + 1;
    anterior = atual;
  }
  return anterior[b.length];
}

// Quanto um termo digitado combina com um termo do catálogo (0 a 1)
export function semelhanca(digitado, termo) {
  if (digitado === termo) return 1;
  if (digitado.length >= 3 && termo.startsWith(digitado)) return 0.85; // "impre" -> "impressora"
  if (termo.length >= 4 && digitado.startsWith(termo)) return 0.75; // "impressoras" -> "impressora"
  if (digitado.length >= 5 && termo.length >= 5 && digitado.slice(0, 5) === termo.slice(0, 5)) return 0.7; // mesmo radical
  if (digitado.length >= 4) {
    const limite = digitado.length >= 7 ? 2 : 1;
    const d = distancia(digitado, termo, limite);
    if (d <= limite) return d === 1 ? 0.7 : 0.55; // erro de digitação
  }
  return 0;
}

// Lugares onde procurar, com o peso de cada um
const PESOS = { nome: 5, palavras: 4, sugestoes: 3, descricao: 2, categoria: 2, perguntas: 1.5, descricaoCategoria: 1, opcoes: 1 };

// Prepara o catálogo (árvore da API) para buscar. Só itens ativos.
export function criarIndice(catalogo) {
  const entradas = [];
  for (const pai of catalogo) {
    if (pai.ativo === false) continue;
    for (const sub of pai.subcategorias || []) {
      if (sub.ativo === false) continue;
      const lugares = {
        nome: [sub.nome],
        palavras: sub.palavras_chave || [],
        sugestoes: sub.sugestoes || [],
        categoria: [pai.nome, ...(pai.palavras_chave || [])],
        descricao: [sub.descricao || ""],
        descricaoCategoria: [pai.descricao || ""],
        perguntas: (sub.campos || []).map((c) => c.rotulo),
        opcoes: (sub.campos || []).flatMap((c) => c.opcoes || []),
      };
      entradas.push({
        sub,
        pai,
        lugares: Object.entries(lugares).map(([lugar, textos]) => ({
          peso: PESOS[lugar],
          termos: [...new Set(textos.flatMap(termos))],
        })),
        // Frases de duas ou mais palavras ("fora do ar", "nao liga") valem bônus
        frases: [...(sub.palavras_chave || []), ...(sub.sugestoes || [])]
          .map(normalizar)
          .filter((f) => f.includes(" ")),
      });
    }
  }
  return entradas;
}

// Busca. Devolve [{ sub, pai, pontos, encontrados: [termos do catálogo] }]
export function buscar(indice, consulta, limite = 5) {
  const digitados = termos(consulta);
  if (!digitados.length) return [];
  const consultaNormalizada = ` ${normalizar(consulta)} `;

  const resultados = [];
  for (const entrada of indice) {
    let pontos = 0;
    let combinados = 0;
    const encontrados = new Set();

    for (const digitado of digitados) {
      const variantes = [[digitado, 1], ...(SINONIMOS[digitado] || []).flatMap((s) => termos(s).map((t) => [t, 0.9]))];
      let melhor = 0;
      let termoMelhor = null;
      for (const lugar of entrada.lugares) {
        for (const termo of lugar.termos) {
          for (const [variante, fator] of variantes) {
            const nota = semelhanca(variante, termo) * fator * lugar.peso;
            if (nota > melhor) { melhor = nota; termoMelhor = termo; }
          }
        }
      }
      if (melhor > 0) {
        pontos += melhor;
        combinados += 1;
        encontrados.add(termoMelhor);
      }
    }

    for (const frase of entrada.frases) {
      if (consultaNormalizada.includes(` ${frase} `)) pontos += 4;
    }

    // Quem combina com mais palavras do que foi digitado fica na frente
    pontos *= 0.5 + 0.5 * (combinados / digitados.length);
    if (pontos >= 2.5) resultados.push({ sub: entrada.sub, pai: entrada.pai, pontos, encontrados: [...encontrados] });
  }

  return resultados
    .sort((a, b) => b.pontos - a.pontos || a.sub.nome.localeCompare(b.sub.nome, "pt-BR"))
    .slice(0, limite);
}

const MODELO_PADRAO = "O que aconteceu:\n\nDesde quando:\n\nO que você já tentou:\n";

export const modeloDescricao = (sub) => sub?.modelo_descricao || MODELO_PADRAO;

const minuscula = (texto) => texto.charAt(0).toLowerCase() + texto.slice(1);
const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Sugestões de título: uma montada a partir das respostas do formulário
// ("Impressora: atolando papel (HP do 2º andar)") e as do catálogo, com as
// mais parecidas com o que já foi digitado primeiro.
export function sugerirTitulos(sub, respostas = {}, digitado = "", limite = 4) {
  if (!sub) return [];
  const sugestoes = [];

  const campos = sub.campos || [];
  const escolhas = campos
    .filter((c) => c.tipo === "selecao" && respostas[c.chave] && respostas[c.chave] !== "Outro")
    .map((c) => minuscula(respostas[c.chave]));
  const detalhe = campos
    .filter((c) => c.tipo === "texto" && String(respostas[c.chave] || "").trim())
    .map((c) => String(respostas[c.chave]).trim())
    .find((t) => t.length <= 40);
  if (escolhas.length) {
    sugestoes.push(`${sub.nome}: ${escolhas.join(", ")}${detalhe ? ` (${detalhe})` : ""}`);
  } else if (detalhe) {
    sugestoes.push(`${sub.nome}: ${detalhe}`);
  }

  const doDigitado = new Set(termos(digitado));
  const parecido = (s) => termos(s).filter((t) => [...doDigitado].some((d) => semelhanca(d, t) > 0)).length;
  const doCatalogo = [...(sub.sugestoes || [])]
    .map((s, i) => ({ s, nota: parecido(s), i }))
    .sort((a, b) => b.nota - a.nota || a.i - b.i)
    .map(({ s }) => s);
  sugestoes.push(...doCatalogo);

  const atual = normalizar(digitado);
  return [...new Set(sugestoes.map(maiuscula))]
    .filter((s) => normalizar(s) !== atual)
    .slice(0, limite);
}
