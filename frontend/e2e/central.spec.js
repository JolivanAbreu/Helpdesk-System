import { test, expect } from "@playwright/test";
import { entrarComo, aviso, mensagemNaConversa } from "./apoio";

// Central de serviços: cards de categoria, modal de subcategorias,
// formulário específico com preenchimento automático e busca inteligente
test.describe("Central de serviços", () => {
  test.beforeEach(({ page }) => entrarComo(page, "colaborador"));

  const formulario = (page) => page.locator("form");
  const resumo = (page) => page.getByRole("region", { name: "Resumo do atendimento" });

  test("colaborador abre pelos cards: categoria, subcategoria e formulário preenchido", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Como podemos ajudar, Lucas?" })).toBeVisible();
    await page.getByRole("button", { name: /^Hardware/ }).click();

    const janela = page.getByRole("dialog", { name: "Hardware" });
    await expect(janela.getByRole("button")).toHaveCount(6); // 5 opções + fechar
    await janela.getByRole("button", { name: /^Computador ou notebook/ }).click();
    await expect(page).toHaveURL(/\/abrir\/2$/);

    // Dados do funcionário vêm do cadastro
    const dados = page.getByRole("definition");
    await expect(page.getByLabel("Dados do solicitante")).toContainText("Lucas Pereira");
    await expect(page.getByLabel("Dados do solicitante")).toContainText("Financeiro");
    await expect(page.getByLabel("Dados do solicitante")).toContainText("Analista Financeiro");
    await expect(dados.first()).toBeVisible();
    await expect(page.getByLabel("Ramal ou telefone para contato")).toHaveValue("2034");
    await expect(page.getByLabel("Local do atendimento")).toHaveValue("Sede · 2º andar");

    // O catálogo define prioridade, prazos e equipe
    await expect(resumo(page)).toContainText("Alta");
    await expect(resumo(page)).toContainText("até 2 h");
    await expect(resumo(page)).toContainText("Service Desk (N1)");

    // Perguntas específicas e sugestão de assunto montada com as respostas
    await page.getByText("Notebook", { exact: true }).click();
    await page.getByLabel(/O que está acontecendo/).selectOption("Lento ou travando");
    await page.getByRole("button", { name: "Computador ou notebook: notebook, lento ou travando" }).click();
    await expect(page.getByLabel("Assunto", { exact: true })).toHaveValue("Computador ou notebook: notebook, lento ou travando");

    await page.getByRole("button", { name: "Usar modelo de descrição" }).click();
    await expect(page.getByLabel("Descrição")).toHaveValue(/^O que aconteceu:/);
    await page.getByLabel("Descrição").fill("Demora 10 minutos para ligar.");
    await formulario(page).getByRole("button", { name: "Abrir chamado" }).click();

    await expect(page).toHaveURL(/\/chamado\/18$/);
    await expect(aviso(page, "Chamado CH-0018 aberto. A equipe Service Desk (N1) foi avisada.")).toBeVisible();
    const respostas = page.getByLabel("Respostas do formulário");
    await expect(respostas).toContainText("Tipo de equipamento");
    await expect(respostas).toContainText("Notebook");
    await expect(respostas).toContainText("Lento ou travando");
    await expect(page.getByRole("region", { name: "Detalhes do chamado" })).toContainText("2034");
  });

  test("perguntas obrigatórias precisam de resposta", async ({ page }) => {
    await page.goto("/abrir/8"); // Software › Sistema fora do ar
    await page.getByLabel("Assunto", { exact: true }).fill("ERP caiu");
    await page.getByLabel("Descrição").fill("Erro na tela de login.");
    await formulario(page).getByRole("button", { name: "Abrir chamado" }).click();
    await expect(aviso(page, "Responda as perguntas obrigatórias.")).toBeVisible();
    await expect(page.getByText("Obrigatório.")).toHaveCount(2);
    await expect(page).toHaveURL(/\/abrir\/8$/);

    await page.getByText("ERP", { exact: true }).click();
    await page.getByText("Meu setor", { exact: true }).click();
    await formulario(page).getByRole("button", { name: "Abrir chamado" }).click();
    await expect(page).toHaveURL(/\/chamado\/18$/);
    await expect(page.getByRole("region", { name: "Detalhes do chamado" })).toContainText("Sistemas (N2)");
  });

  test("busca inteligente entende erro de digitação e leva ao formulário com o assunto", async ({ page }) => {
    const busca = page.getByRole("combobox", { name: "Descreva o que aconteceu" });
    await busca.fill("impresora atolada");
    const sugeridos = page.getByRole("listbox", { name: "Serviços sugeridos" });
    await expect(sugeridos.getByRole("option").first()).toContainText("Impressora");
    await busca.press("Enter");

    await expect(page).toHaveURL(/\/abrir\/3$/);
    await expect(page.getByRole("heading", { name: "Impressora" })).toBeVisible();
    await expect(page.getByLabel("Assunto", { exact: true })).toHaveValue("impresora atolada");
  });

  test("busca sem resultado oferece Outros assuntos", async ({ page }) => {
    await page.getByRole("combobox", { name: "Descreva o que aconteceu" }).fill("xyzqwk");
    await page.getByRole("button", { name: "abra em Outros assuntos" }).click();
    await expect(page.getByRole("heading", { name: "Outros assuntos" })).toBeVisible();
    await expect(page.getByLabel("Assunto", { exact: true })).toHaveValue("xyzqwk");
  });

  test("avisa quando já existe chamado aberto do mesmo tipo", async ({ page }) => {
    await page.goto("/abrir/3"); // Lucas já tem o CH-0001 de impressora
    const parecidos = page.getByRole("region", { name: "Chamados parecidos" });
    await expect(parecidos).toContainText("Você já tem um chamado aberto deste tipo");
    await parecidos.getByRole("link", { name: /CH-0001/ }).click();
    await expect(page).toHaveURL(/\/chamado\/1$/);
  });

  test("sugere trocar de serviço quando o assunto combina com outro", async ({ page }) => {
    await page.goto("/abrir/3");
    await page.getByLabel("Assunto", { exact: true }).fill("esqueci a senha do sistema");
    await expect(page.getByText("Pelo assunto, isto parece ser Acessos e senhas › Redefinir senha.")).toBeVisible();
    await page.getByRole("button", { name: "Trocar", exact: true }).click();
    await expect(page).toHaveURL(/\/abrir\/21$/);
    await expect(page.getByLabel("Assunto", { exact: true })).toHaveValue("esqueci a senha do sistema");
  });

  test("contato diferente pode virar o padrão dos próximos chamados", async ({ page }) => {
    await page.goto("/abrir/29");
    // Espera o preenchimento automático antes de trocar o contato
    await expect(page.getByLabel("Ramal ou telefone para contato")).toHaveValue("2034");
    await page.getByLabel("Ramal ou telefone para contato").fill("(85) 98888-0000");
    await page.getByLabel("Usar este contato e local nos próximos chamados").check();
    await page.getByLabel("Assunto", { exact: true }).fill("Dúvida");
    await page.getByLabel("Descrição").fill("Teste");
    await formulario(page).getByRole("button", { name: "Abrir chamado" }).click();
    await expect(page).toHaveURL(/\/chamado\/18$/);

    await page.goto("/abrir/29");
    await expect(page.getByLabel("Ramal ou telefone para contato")).toHaveValue("(85) 98888-0000");
  });

  test("Esc fecha o modal de subcategorias e o atalho N leva à central", async ({ page }) => {
    await page.goto("/chamados");
    await page.keyboard.press("n");
    await expect(page).toHaveURL(/\/abrir$/);
    await page.getByRole("button", { name: /^Rede e internet/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("lista os chamados em aberto do colaborador", async ({ page }) => {
    const pendentes = page.getByRole("region", { name: "Seus chamados em aberto" });
    await expect(pendentes.getByRole("link", { name: "Impressora do 2º andar não imprime" })).toBeVisible();
    await expect(mensagemNaConversa(page, "x")).toHaveCount(0);
  });
});
