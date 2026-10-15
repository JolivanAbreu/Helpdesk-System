import { test, expect } from "@playwright/test";
import { entrarComo, aviso, mensagemNaConversa } from "./apoio";

const conversa = (page) => page.getByRole("region", { name: "Conversa" });

test.describe("Chamado", () => {
  test("colaborador abre um chamado pelo atalho N, com a prioridade escolhida", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.keyboard.press("n");

    const janela = page.getByRole("dialog", { name: "Novo chamado" });
    await janela.getByLabel("Assunto").fill("Notebook não carrega");
    await janela.getByLabel("Categoria").selectOption("hardware");
    await janela.getByLabel("Descrição").fill("A bateria não carrega mesmo na tomada.");
    await janela.getByText("Impede o meu trabalho").click();
    await janela.getByRole("button", { name: "Abrir chamado" }).click();

    await expect(page).toHaveURL(/\/chamado\/18$/);
    await expect(page.getByRole("heading", { name: "Notebook não carrega" })).toBeVisible();
    await expect(page.getByText("Alta").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Detalhes do chamado" })).toContainText("Hardware");
  });

  test("a categoria é obrigatória ao abrir um chamado", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await page.keyboard.press("n");
    const janela = page.getByRole("dialog", { name: "Novo chamado" });
    await janela.getByLabel("Assunto").fill("Sem categoria");
    await janela.getByLabel("Descrição").fill("Teste");
    await janela.getByRole("button", { name: "Abrir chamado" }).click();
    await expect(janela).toBeVisible();
    await expect(page).not.toHaveURL(/\/chamado\/18/);
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

  test("suporte recategoriza e a timeline registra", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/1");
    await page.getByLabel("Categoria").selectOption("rede");
    await expect(conversa(page).getByText("alterou a categoria de Hardware para Rede e internet")).toBeVisible();
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
