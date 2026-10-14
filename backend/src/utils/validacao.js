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

module.exports = { texto, validarCadastro, validarLogin, validarChamado, validarMensagem };
