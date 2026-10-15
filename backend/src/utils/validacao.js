// src/utils/validacao.js
// Validações simples de entrada. Na migração para TypeScript
// estas funções serão substituídas por schemas do Zod.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Recebe um objeto { campo: mensagemDeErro | null } e devolve
// a primeira mensagem de erro encontrada, ou null se estiver tudo certo.
const primeiroErro = (regras) => Object.values(regras).find(Boolean) || null;

function validarCadastro({ nome, email, senha }) {
  return primeiroErro({
    nome: texto(nome).length < 2 ? 'Informe o nome (mínimo 2 caracteres).' : null,
    email: !EMAIL_REGEX.test(texto(email)) ? 'Informe um e-mail válido.' : null,
    senha: typeof senha !== 'string' || senha.length < 6 ? 'A senha deve ter pelo menos 6 caracteres.' : null,
  });
}

function validarLogin({ email, senha }) {
  return primeiroErro({
    email: !texto(email) ? 'Informe o e-mail.' : null,
    senha: typeof senha !== 'string' || !senha ? 'Informe a senha.' : null,
  });
}

function validarChamado({ titulo, descricao }) {
  return primeiroErro({
    titulo: texto(titulo).length < 3 ? 'Informe um título (mínimo 3 caracteres).' : null,
    tituloMax: texto(titulo).length > 255 ? 'O título deve ter no máximo 255 caracteres.' : null,
    descricao: !texto(descricao) ? 'Descreva o problema.' : null,
  });
}

function validarMensagem({ mensagem }) {
  return !texto(mensagem) ? 'A mensagem não pode ficar vazia.' : null;
}

// Dados opcionais do funcionário e do contato do chamado: só os campos
// enviados, com tamanho máximo. Vazio vira null. Devolve { erro } ou { dados }.
const LIMITES_DADOS = {
  setor: ['Setor', 80],
  cargo: ['Cargo', 80],
  ramal: ['Ramal ou telefone', 30],
  localizacao: ['Localização', 120],
  contato: ['Contato', 40],
  local: ['Local do atendimento', 120],
};

function validarDadosOpcionais(corpo, campos) {
  const dados = {};
  for (const campo of campos) {
    if (corpo[campo] === undefined) continue;
    if (corpo[campo] !== null && typeof corpo[campo] !== 'string') {
      return { erro: `${LIMITES_DADOS[campo][0]} deve ser um texto.` };
    }
    const valor = texto(corpo[campo]);
    if (valor.length > LIMITES_DADOS[campo][1]) {
      return { erro: `${LIMITES_DADOS[campo][0]} deve ter no máximo ${LIMITES_DADOS[campo][1]} caracteres.` };
    }
    dados[campo] = valor || null;
  }
  return { dados };
}

module.exports = {
  texto, validarCadastro, validarLogin, validarChamado, validarMensagem, validarDadosOpcionais,
};
