// src/demo/catalogo.js
// Catálogo e grupos de fábrica da demonstração: cópia de
// backend/src/database/catalogoPadrao.js (os testes de contrato conferem
// que os dois lados devolvem o mesmo catálogo, com os mesmos IDs).

// Mesmas metas de backend/src/config/perfis.js (horas corridas)
export const METAS_SLA = {
  critica: { resposta: 1, solucao: 4 },
  alta: { resposta: 2, solucao: 8 },
  media: { resposta: 4, solucao: 24 },
  baixa: { resposta: 8, solucao: 72 },
};

const GRUPOS = [
  { chave: "n1", nome: "Service Desk (N1)", descricao: "Primeiro atendimento: triagem, acessos, equipamentos e dúvidas" },
  { chave: "infra", nome: "Infraestrutura (N2)", descricao: "Rede, servidores, backup, telefonia e segurança" },
  { chave: "sistemas", nome: "Sistemas (N2)", descricao: "ERP e sistemas internos" },
];

const CATALOGO = [
  {
    nome: "Hardware", icone: "hardware", grupo: "n1", descricao: "Computador, impressora, monitor e periféricos",
    subcategorias: [
      { nome: "Computador ou notebook", prioridade: "alta", descricao: "Não liga, reinicia sozinho, está lento ou com defeito" },
      { nome: "Impressora", prioridade: "alta", descricao: "Não imprime, atola papel ou está sem toner" },
      { nome: "Monitor e vídeo", prioridade: "media" },
      { nome: "Teclado, mouse e webcam", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Software e sistemas", icone: "software", grupo: "n1", descricao: "Programas, sistemas internos e licenças",
    subcategorias: [
      { nome: "Sistema fora do ar", prioridade: "critica", grupo: "sistemas", descricao: "ERP ou sistema interno indisponível" },
      { nome: "Backup e servidores", prioridade: "critica", grupo: "infra" },
      { nome: "Antivírus e segurança", prioridade: "alta", grupo: "infra" },
      { nome: "Licenças", prioridade: "media" },
      { nome: "Instalação de programa", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Rede e internet", icone: "rede", grupo: "infra", descricao: "Internet, VPN, Wi-Fi e telefonia",
    subcategorias: [
      { nome: "Lentidão ou queda de rede", prioridade: "alta" },
      { nome: "VPN", prioridade: "media" },
      { nome: "Telefone IP", prioridade: "media" },
      { nome: "Wi-Fi", prioridade: "baixa" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Acessos e senhas", icone: "acessos", grupo: "n1", descricao: "Senhas, permissões e usuários",
    subcategorias: [
      { nome: "Redefinir senha", prioridade: "alta", slaResposta: 0.5, slaSolucao: 2, descricao: "Senha expirada ou conta bloqueada" },
      { nome: "Permissão em pasta ou sistema", prioridade: "media" },
      { nome: "Criar ou desativar usuário", prioridade: "media" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "E-mail", icone: "email", grupo: "n1", descricao: "Caixa de entrada, Outlook e envio",
    subcategorias: [
      { nome: "Configuração de e-mail", prioridade: "media" },
      { nome: "Outros", prioridade: "media" },
    ],
  },
  {
    nome: "Outros", icone: "outros", grupo: "n1", descricao: "Qualquer outro assunto",
    subcategorias: [{ nome: "Outros assuntos", prioridade: "media" }],
  },
];

// Formulário de cada subcategoria: palavras-chave da busca, sugestões de
// título, modelo de descrição e campos específicos (cópia de
// DETALHES_CATALOGO em backend/src/database/catalogoPadrao.js)
const DETALHES_CATALOGO = {
  "Hardware › Computador ou notebook": {"palavras":["pc","computador","notebook","maquina","desktop","cpu","lento","travando","nao liga","tela azul","reiniciando","bateria","carregador","barulho"],"sugestoes":["Computador não liga","Computador muito lento","Computador reiniciando sozinho","Notebook não carrega a bateria"],"campos":[{"rotulo":"Tipo de equipamento","tipo":"selecao","opcoes":["Desktop","Notebook"],"obrigatorio":true},{"rotulo":"O que está acontecendo","tipo":"selecao","opcoes":["Não liga","Lento ou travando","Reinicia sozinho","Tela azul","Outro"],"obrigatorio":true},{"rotulo":"Número de patrimônio","tipo":"texto","obrigatorio":false,"ajuda":"Etiqueta colada no equipamento, se houver"}]},
  "Hardware › Impressora": {"palavras":["impressora","imprimir","impressao","toner","papel","atolado","atolando","scanner","digitalizar","xerox","copiadora","cartucho"],"sugestoes":["Impressora não imprime","Impressora atolando papel","Toner da impressora acabou","Scanner não digitaliza"],"campos":[{"rotulo":"Qual impressora","tipo":"texto","obrigatorio":true,"ajuda":"Modelo ou onde ela fica. Ex.: HP do 2º andar"},{"rotulo":"Problema","tipo":"selecao","opcoes":["Não imprime","Atolando papel","Sem toner","Impressão falhada ou manchada","Scanner","Outro"],"obrigatorio":true}]},
  "Hardware › Monitor e vídeo": {"palavras":["monitor","tela","video","imagem","hdmi","piscando","sem sinal","segunda tela","projetor","resolucao"],"sugestoes":["Monitor sem sinal","Monitor piscando","Segunda tela não é reconhecida"],"campos":[{"rotulo":"Número de patrimônio","tipo":"texto","obrigatorio":false,"ajuda":"Etiqueta colada no monitor, se houver"}]},
  "Hardware › Teclado, mouse e webcam": {"palavras":["teclado","mouse","webcam","camera","headset","fone","microfone","periferico","tecla","audio","som"],"sugestoes":["Mouse parou de funcionar","Teclado com teclas falhando","Webcam não funciona nas reuniões","Headset sem áudio"],"campos":[{"rotulo":"Equipamento","tipo":"selecao","opcoes":["Teclado","Mouse","Webcam","Headset ou fone","Outro"],"obrigatorio":true}]},
  "Hardware › Outros": {"palavras":["equipamento","hardware","peca","cabo","estabilizador","nobreak"],"sugestoes":["Solicitação de equipamento","Problema em equipamento"]},
  "Software e sistemas › Sistema fora do ar": {"palavras":["sistema","fora do ar","erp","caiu","indisponivel","erro 503","nao abre","nao carrega","ponto","intranet","totvs","sap"],"sugestoes":["ERP fora do ar","Sistema não abre","Erro ao entrar no sistema","Sistema de ponto indisponível"],"modelo":"Mensagem de erro exibida:\n\nHorário em que começou:\n\nO que você estava fazendo:\n","campos":[{"rotulo":"Sistema","tipo":"selecao","opcoes":["ERP","Sistema de ponto","Intranet","Outro"],"obrigatorio":true},{"rotulo":"Quem está sem acesso","tipo":"selecao","opcoes":["Só eu","Meu setor","Vários setores"],"obrigatorio":true},{"rotulo":"Mensagem de erro","tipo":"texto","obrigatorio":false,"ajuda":"Copie o texto da tela, se houver"}]},
  "Software e sistemas › Backup e servidores": {"palavras":["backup","servidor","rotina","restaurar","arquivo apagado","recuperar","pasta de rede","storage","versao anterior"],"sugestoes":["Recuperar arquivo apagado da rede","Falha na rotina de backup","Servidor de arquivos inacessível"],"campos":[{"rotulo":"Pasta ou servidor","tipo":"texto","obrigatorio":false,"ajuda":"Ex.: \\\\servidor\\financeiro"}]},
  "Software e sistemas › Antivírus e segurança": {"palavras":["virus","antivirus","malware","phishing","email suspeito","link suspeito","quarentena","bloqueado","ransomware","invasao","golpe","hacker"],"sugestoes":["Recebi um e-mail suspeito","Antivírus bloqueando programa","Computador com vírus"],"modelo":"Remetente, site ou programa suspeito:\n\nO que você fez (clicou, baixou, digitou senha):\n\nQuando aconteceu:\n","campos":[{"rotulo":"Você clicou em algum link ou abriu anexo?","tipo":"selecao","opcoes":["Sim","Não","Não sei"],"obrigatorio":true}]},
  "Software e sistemas › Licenças": {"palavras":["licenca","office","word","excel","powerpoint","ativacao","expirada","somente leitura","chave","adobe","acrobat"],"sugestoes":["Licença do Office expirada","Programa pedindo ativação","Word em modo somente leitura"],"campos":[{"rotulo":"Programa","tipo":"texto","obrigatorio":true,"ajuda":"Ex.: Microsoft Office, Adobe Acrobat"}]},
  "Software e sistemas › Instalação de programa": {"palavras":["instalar","instalacao","programa","software","aplicativo","power bi","baixar","download","atualizar","atualizacao"],"sugestoes":["Instalação de programa","Atualizar programa","Instalação do Power BI"],"campos":[{"rotulo":"Programa","tipo":"texto","obrigatorio":true},{"rotulo":"Para que vai usar","tipo":"texto","obrigatorio":true,"ajuda":"Ajuda a equipe a aprovar a instalação"}]},
  "Software e sistemas › Outros": {"palavras":["duvida","programa","configurar","erro"],"sugestoes":["Dúvida sobre programa","Erro em programa"]},
  "Rede e internet › Lentidão ou queda de rede": {"palavras":["internet","rede","lento","lentidao","caiu","sem internet","conexao","cabo de rede","queda","oscilando","desconectando"],"sugestoes":["Internet lenta","Sem acesso à internet","Rede caindo várias vezes"],"campos":[{"rotulo":"Onde acontece","tipo":"selecao","opcoes":["Só no meu computador","No meu setor","Na empresa toda"],"obrigatorio":true}]},
  "Rede e internet › VPN": {"palavras":["vpn","acesso remoto","home office","trabalho remoto","forticlient","conectar de casa","certificado"],"sugestoes":["Não consigo conectar na VPN","VPN desconectando","Acesso remoto ao computador do escritório"],"campos":[{"rotulo":"De onde você está conectando","tipo":"selecao","opcoes":["Casa","Outra unidade","Viagem"],"obrigatorio":false}]},
  "Rede e internet › Telefone IP": {"palavras":["telefone","ramal","ligacao","mudo","sem sinal","voip","aparelho","chamada","transferir ligacao"],"sugestoes":["Telefone sem sinal","Ramal não recebe ligações","Configurar ramal na nova mesa"],"campos":[{"rotulo":"Ramal com problema","tipo":"texto","obrigatorio":true}]},
  "Rede e internet › Wi-Fi": {"palavras":["wifi","wireless","sem fio","sinal fraco","senha do wifi","visitantes","roteador"],"sugestoes":["Wi-Fi sem sinal","Senha do Wi-Fi de visitantes","Wi-Fi caindo"],"campos":[{"rotulo":"Rede","tipo":"selecao","opcoes":["Corporativa","Visitantes"],"obrigatorio":false}]},
  "Rede e internet › Outros": {"palavras":["rede","ponto de rede","switch","cabeamento"],"sugestoes":["Instalar ponto de rede","Problema de rede"]},
  "Acessos e senhas › Redefinir senha": {"palavras":["senha","esqueci","bloqueado","bloqueada","expirada","resetar","redefinir","desbloquear","conta","login","trocar senha"],"sugestoes":["Redefinir senha de rede","Conta bloqueada","Senha expirada"],"campos":[{"rotulo":"Senha de qual sistema","tipo":"selecao","opcoes":["Rede/Windows","E-mail","ERP","Outro"],"obrigatorio":true},{"rotulo":"Usuário de login","tipo":"texto","obrigatorio":false,"ajuda":"Se for diferente do seu e-mail"}]},
  "Acessos e senhas › Permissão em pasta ou sistema": {"palavras":["permissao","acesso","pasta","compartilhada","liberar","acesso negado","autorizacao","perfil de acesso"],"sugestoes":["Acesso à pasta compartilhada","Liberar acesso ao sistema","Acesso negado em pasta"],"campos":[{"rotulo":"Pasta ou sistema","tipo":"texto","obrigatorio":true},{"rotulo":"Tipo de acesso","tipo":"selecao","opcoes":["Somente leitura","Leitura e escrita"],"obrigatorio":true},{"rotulo":"Gestor que aprova","tipo":"texto","obrigatorio":false,"ajuda":"Quem autoriza o acesso"}]},
  "Acessos e senhas › Criar ou desativar usuário": {"palavras":["novo colaborador","admissao","contratacao","desligamento","demissao","criar usuario","desativar usuario","conta nova","onboarding"],"sugestoes":["Criar usuário para novo colaborador","Desativar usuário de colaborador desligado"],"campos":[{"rotulo":"Ação","tipo":"selecao","opcoes":["Criar usuário","Desativar usuário"],"obrigatorio":true},{"rotulo":"Nome do colaborador","tipo":"texto","obrigatorio":true},{"rotulo":"Data de início ou desligamento","tipo":"texto","obrigatorio":false}]},
  "Acessos e senhas › Outros": {"palavras":["acesso","usuario","cracha","biometria"],"sugestoes":["Problema de acesso"]},
  "E-mail › Configuração de e-mail": {"palavras":["email","outlook","caixa de entrada","sincronizar","sincroniza","celular","assinatura","nao recebe","nao envia","spam","caixa cheia","webmail"],"sugestoes":["Outlook não sincroniza","Não estou recebendo e-mails","Caixa de e-mail cheia","Configurar e-mail no celular"],"campos":[{"rotulo":"Onde","tipo":"selecao","opcoes":["Computador (Outlook)","Celular","Webmail"],"obrigatorio":false}]},
  "E-mail › Outros": {"palavras":["email","lista de distribuicao","grupo de email","calendario"],"sugestoes":["Criar lista de e-mail","Problema no calendário do Outlook"]},
  "Outros › Outros assuntos": {"palavras":["duvida","outro","ajuda","solicitacao"],"sugestoes":["Dúvida geral","Solicitação diversa"]},
};

// "Número de patrimônio" -> "numero_de_patrimonio" (igual a backend/src/services/formulario.js)
export function chaveDoCampo(rotulo) {
  return String(rotulo)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "campo";
}

// Monta as tabelas na mesma ordem de inserção do backend (mesmos IDs)
export function catalogoInicial(criadoEm) {
  const grupos = GRUPOS.map((g, i) => ({ id: i + 1, nome: g.nome, descricao: g.descricao, ativo: true, createdAt: criadoEm }));
  const idGrupo = Object.fromEntries(GRUPOS.map((g, i) => [g.chave, i + 1]));
  const categorias = [];
  CATALOGO.forEach((c) => {
    const pai = {
      id: categorias.length + 1, nome: c.nome, descricao: c.descricao || null, icone: c.icone, parent_id: null,
      prioridade: null, sla_resposta_horas: null, sla_solucao_horas: null, grupo_id: idGrupo[c.grupo], ativo: true,
      palavras_chave: [], sugestoes: [], modelo_descricao: null, campos: [],
    };
    categorias.push(pai);
    c.subcategorias.forEach((s) => {
      const meta = METAS_SLA[s.prioridade];
      const d = DETALHES_CATALOGO[`${c.nome} › ${s.nome}`] || {};
      categorias.push({
        id: categorias.length + 1, nome: s.nome, descricao: s.descricao || null, icone: null, parent_id: pai.id,
        prioridade: s.prioridade, sla_resposta_horas: s.slaResposta ?? meta.resposta, sla_solucao_horas: s.slaSolucao ?? meta.solucao,
        grupo_id: idGrupo[s.grupo || c.grupo], ativo: true,
        palavras_chave: d.palavras || [], sugestoes: d.sugestoes || [], modelo_descricao: d.modelo || null,
        campos: (d.campos || []).map((campo) => ({ chave: chaveDoCampo(campo.rotulo), ajuda: null, opcoes: [], ...campo })),
      });
    });
  });
  return { grupos, categorias };
}
