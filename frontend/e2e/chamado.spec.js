import { test, expect } from "@playwright/test";
import { entrarComo, aviso, mensagemNaConversa, escolher } from "./apoio";

const conversa = (page) => page.getByRole("region", { name: "Conversa" });

test.describe("Chamado", () => {
  test("colaborador abre pelo atalho N e a subcategoria define prioridade, prazos e grupo", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.keyboard.press("n");

    const janela = page.getByRole("dialog", { name: "Novo chamado" });
    await janela.getByLabel("Assunto", { exact: true }).fill("Notebook não carrega");
    await escolher(janela, /^Hardware/);
    await escolher(janela, /^Computador ou notebook/);
    await expect(janela).toContainText("Resposta em até 2 h");
    await expect(janela).toContainText("solução em até 8 h");
    await expect(janela).toContainText("Service Desk (N1)");
    await expect(janela.getByText("Quanto isso afeta você?")).toHaveCount(0);
    await janela.getByLabel("Descrição").fill("A bateria não carrega mesmo na tomada.");
    await janela.getByRole("button", { name: "Abrir chamado" }).click();

    await expect(page).toHaveURL(/\/chamado\/18$/);
    await expect(page.getByRole("heading", { name: "Notebook não carrega" })).toBeVisible();
    const detalhes = page.getByRole("region", { name: "Detalhes do chamado" });
    await expect(detalhes).toContainText("Alta");
    await expect(detalhes).toContainText("Hardware › Computador ou notebook");
    await expect(detalhes).toContainText("Service Desk (N1)");
  });

  test("só dá para abrir depois de escolher o tipo de problema", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.keyboard.press("n");
    const janela = page.getByRole("dialog", { name: "Novo chamado" });
    await janela.getByLabel("Assunto", { exact: true }).fill("Sem categoria");
    await janela.getByLabel("Descrição").fill("Teste");
    const abrir = janela.getByRole("button", { name: "Abrir chamado" });
    await expect(abrir).toBeDisabled();

    await escolher(janela, /^Rede e internet/);
    await expect(abrir).toBeDisabled();
    await escolher(janela, /^VPN/);
    await expect(abrir).toBeEnabled();

    // Categoria com uma única opção já vem escolhida
    await escolher(janela, /^Outros\s*Qualquer outro assunto/);
    await expect(janela.getByRole("radio", { name: /^Outros assuntos/ })).toBeChecked();
    await expect(abrir).toBeEnabled();
  });

  test("mostra os prazos de resposta e de solução", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/3");
    const prazos = page.getByRole("region", { name: "Prazos de atendimento" });
    await expect(prazos).toContainText("Primeira resposta");
    await expect(prazos).toContainText("Cumprido");
    await expect(prazos).toContainText("Atrasado");
    await expect(prazos.getByRole("progressbar")).toHaveCount(2);
  });

  test("suporte reclassifica e a prioridade segue a nova subcategoria", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/6");
    await page.getByLabel("Categoria").selectOption({ label: "Redefinir senha" });
    await expect(conversa(page).getByText(
      "alterou a categoria de Rede e internet › Telefone IP para Acessos e senhas › Redefinir senha (prioridade alta)",
    )).toBeVisible();
    await expect(page.getByLabel("Prioridade")).toHaveValue("alta");
  });

  test("suporte transfere para o N2 com motivo, e o histórico registra", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/1");
    const detalhes = page.getByRole("region", { name: "Detalhes do chamado" });
    await expect(detalhes).toContainText("Service Desk (N1)");
    await detalhes.getByRole("button", { name: "Transferir" }).click();

    const janela = page.getByRole("dialog", { name: "Transferir chamado" });
    const transferir = janela.getByRole("button", { name: "Transferir" });
    await expect(transferir).toBeDisabled();
    await janela.getByLabel("Grupo").selectOption({ label: "Infraestrutura (N2)" });
    // Só os membros do grupo escolhido aparecem
    await expect(janela.getByLabel("Técnico").locator("option")).toHaveText(["Fila do grupo (sem técnico)", "Rafael Costa"]);
    await janela.getByLabel("Técnico").selectOption({ label: "Rafael Costa" });
    await janela.getByLabel("Motivo").fill("Servidor de impressão fora do ar");
    await transferir.click();

    await expect(aviso(page, "Chamado transferido para Rafael Costa.")).toBeVisible();
    await expect(janela).toHaveCount(0);
    await expect(detalhes).toContainText("Infraestrutura (N2)");
    await expect(conversa(page).getByText(
      "transferiu o chamado para Infraestrutura (N2) / Rafael Costa. Motivo: Servidor de impressão fora do ar",
    )).toBeVisible();
  });

  test("nota interna aparece para a equipe e não para o solicitante", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/2");
    await page.getByRole("radio", { name: "Nota interna" }).click();
    await page.getByLabel("Nova mensagem").fill("Certificado vence amanhã");
    await page.getByRole("button", { name: "Salvar nota" }).click();
    await expect(mensagemNaConversa(page, "Certificado vence amanhã")).toContainText("Nota interna");

    // Mesma sessão do navegador (a demo guarda os dados nele): sai e entra como o solicitante
    await page.getByRole("button", { name: "Sair" }).click();
    await entrarComo(page, "colaborador");
    await page.goto("/chamado/2");
    await expect(conversa(page)).toBeVisible();
    await expect(mensagemNaConversa(page, "Certificado vence amanhã")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Nota interna" })).toHaveCount(0);
  });

  test("Esc fecha a janela de novo chamado", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("suporte altera prioridade e responsável, e a timeline registra tudo", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/1");

    await page.getByLabel("Prioridade").selectOption("critica");
    await expect(conversa(page).getByText("alterou a prioridade de alta para crítica")).toBeVisible();

    await page.getByLabel("Responsável").selectOption({ label: "Carlos Lima" });
    await expect(conversa(page).getByText("atribuiu o chamado a Carlos Lima")).toBeVisible();

    await page.getByRole("button", { name: "Atribuir a mim" }).click();
    await expect(aviso(page, "Você assumiu o chamado.")).toBeVisible();
  });

  test("mensagem enviada com Ctrl + Enter aparece na conversa", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/2");
    await page.getByLabel("Nova mensagem").fill("Certificado renovado, pode testar?");
    await page.getByLabel("Nova mensagem").press("Control+Enter");
    await expect(mensagemNaConversa(page, "Certificado renovado, pode testar?")).toBeVisible();
    await expect(page.getByLabel("Nova mensagem")).toHaveValue("");
  });

  test("anexo enviado pode ser baixado com o conteúdo original", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.goto("/chamado/1");
    await page.locator('input[type="file"]').setInputFiles({
      name: "print-do-erro.png", mimeType: "image/png", buffer: Buffer.from("conteudo-de-teste"),
    });
    const anexo = page.getByRole("button", { name: /print-do-erro\.png/ });
    await expect(anexo).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), anexo.click()]);
    const caminho = await download.path();
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(caminho, "utf8")).toBe("conteudo-de-teste");
  });

  test("colaborador marca o próprio chamado como resolvido e reabre", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.goto("/chamado/1");
    await page.getByRole("button", { name: "Marcar como resolvido" }).click();
    await expect(aviso(page, "Chamado marcado como resolvido.")).toBeVisible();
    await page.getByRole("button", { name: "Reabrir chamado" }).click();
    await expect(aviso(page, "Chamado reaberto.")).toBeVisible();
  });
});
