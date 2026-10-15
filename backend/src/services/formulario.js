// src/services/formulario.js
// Formulário específico de cada subcategoria: definição dos campos (feita
// pelo admin no catálogo) e validação das respostas (na abertura do chamado).
// A mesma regra existe na demo (frontend/src/demo/adaptador.js).
const { texto } = require('../utils/validacao');

const TIPOS_CAMPO = ['texto', 'numero', 'selecao'];
const LIMITES = {
  campos: 8, rotulo: 80, ajuda: 120, opcoes: 15, opcao: 60, resposta: 500,
  palavras: 40, palavra: 40, sugestoes: 10, sugestao: 120, modelo: 1000,
};

// "Número de patrimônio" -> "numero_de_patrimonio"
function chaveDoCampo(rotulo) {
  return String(rotulo)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'campo';
}

// Lista de textos curtos (palavras-chave, sugestões): limpa, sem repetidos
function validarLista(valor, { max, maxItem, nome }) {
  if (!Array.isArray(valor) || !valor.every((v) => typeof v === 'string')) {
    return { erro: `Informe "${nome}" como uma lista de textos.` };
  }
  const itens = [...new Set(valor.map((v) => v.trim()).filter(Boolean))];
  if (itens.length > max) return { erro: `"${nome}" aceita no máximo ${max} itens.` };
  if (itens.some((v) => v.length > maxItem)) return { erro: `Cada item de "${nome}" deve ter no máximo ${maxItem} caracteres.` };
  return { valor: itens };
}

// Definição dos campos enviada pelo admin. Devolve { erro } ou { valor }.
function validarCampos(campos) {
  if (!Array.isArray(campos)) return { erro: 'Informe "campos" como uma lista.' };
  if (campos.length > LIMITES.campos) return { erro: `O formulário aceita no máximo ${LIMITES.campos} campos.` };

  const valor = [];
  for (const campo of campos) {
    if (!campo || typeof campo !== 'object') return { erro: 'Campo inválido no formulário.' };
    const rotulo = texto(campo.rotulo);
    if (rotulo.length < 2 || rotulo.length > LIMITES.rotulo) {
      return { erro: `Cada campo precisa de um rótulo de 2 a ${LIMITES.rotulo} caracteres.` };
    }
    if (!TIPOS_CAMPO.includes(campo.tipo)) {
      return { erro: `Tipo de campo inválido em "${rotulo}". Use: ${TIPOS_CAMPO.join(', ')}.` };
    }
    const ajuda = texto(campo.ajuda);
    if (ajuda.length > LIMITES.ajuda) return { erro: `A ajuda de "${rotulo}" deve ter no máximo ${LIMITES.ajuda} caracteres.` };

    let opcoes = [];
    if (campo.tipo === 'selecao') {
      const lista = validarLista(campo.opcoes ?? [], { max: LIMITES.opcoes, maxItem: LIMITES.opcao, nome: `opções de ${rotulo}` });
      if (lista.erro) return lista;
      if (lista.valor.length < 2) return { erro: `"${rotulo}" precisa de pelo menos 2 opções.` };
      opcoes = lista.valor;
    }

    // Chave derivada do rótulo, sem repetir dentro do formulário
    let chave = chaveDoCampo(rotulo);
    for (let n = 2; valor.some((c) => c.chave === chave); n += 1) chave = `${chaveDoCampo(rotulo)}_${n}`;

    valor.push({ chave, rotulo, tipo: campo.tipo, obrigatorio: campo.obrigatorio === true, ajuda: ajuda || null, opcoes });
  }
  return { valor };
}

// Respostas do solicitante para os campos da subcategoria.
// Guarda uma cópia com o rótulo, para o chamado continuar legível mesmo
// que o admin mude o formulário depois: [{ chave, rotulo, valor }]
function validarRespostas(campos, respostas = {}) {
  if (respostas === null || typeof respostas !== 'object' || Array.isArray(respostas)) {
    return { erro: 'Informe "respostas" como um objeto { campo: valor }.' };
  }
  const valor = [];
  for (const campo of campos) {
    const bruto = respostas[campo.chave];
    const resposta = typeof bruto === 'number' ? String(bruto) : texto(bruto);
    if (!resposta) {
      if (campo.obrigatorio) return { erro: `Preencha "${campo.rotulo}".` };
      continue;
    }
    if (resposta.length > LIMITES.resposta) {
      return { erro: `"${campo.rotulo}" deve ter no máximo ${LIMITES.resposta} caracteres.` };
    }
    if (campo.tipo === 'selecao' && !campo.opcoes.includes(resposta)) {
      return { erro: `Escolha uma das opções de "${campo.rotulo}".` };
    }
    if (campo.tipo === 'numero' && !Number.isFinite(Number(resposta.replace(',', '.')))) {
      return { erro: `"${campo.rotulo}" deve ser um número.` };
    }
    valor.push({ chave: campo.chave, rotulo: campo.rotulo, valor: resposta });
  }
  return { valor };
}

module.exports = {
  TIPOS_CAMPO, LIMITES, chaveDoCampo, validarLista, validarCampos, validarRespostas,
};
