// tests/apoio/catalogo.mjs
// IDs do catálogo e dos grupos de fábrica (mesma ordem de inserção nos
// dois lados: backend/src/database/catalogoPadrao.js e frontend/src/demo/catalogo.js)

export const GRUPO = { n1: 1, infra: 2, sistemas: 3 };

export const CAT = { hardware: 1, software: 7, rede: 14, acessos: 20, email: 25, outros: 28 };

export const SUB = {
  computador: 2, impressora: 3, monitor: 4, perifericos: 5, hardwareOutros: 6,
  sistemaForaDoAr: 8, backup: 9, antivirus: 10, licencas: 11, instalacao: 12, softwareOutros: 13,
  lentidao: 15, vpn: 16, telefone: 17, wifi: 18, redeOutros: 19,
  redefinirSenha: 21, permissao: 22, criarUsuario: 23, acessosOutros: 24,
  configEmail: 26, emailOutros: 27,
  outrosAssuntos: 29,
};
