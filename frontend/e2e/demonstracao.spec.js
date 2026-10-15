import { test, expect } from "@playwright/test";
import { entrarComo, mensagemNaConversa } from "./apoio";

test.describe("Demonstração sem servidor", () => {
  test("não faz nenhuma requisição a um backend", async ({ page }) => {
    const chamadasAoServidor = [];
    page.on("request", (r) => {
      if (/\/api\//.test(r.url())) chamadasAoServidor.push(r.url());
    });
    await entrarComo(page, "suporte");
    await page.goto("/chamado/2");
    await expect(page.getByRole("region", { name: "Conversa" })).toBeVisible();
    expect(chamadasAoServidor).toEqual([]);
  });

  test("guarda as alterações no navegador e restaura os dados de exemplo", async ({ page }) => {
    await entrarComo(page, "suporte");
    await page.goto("/chamado/2");
    await page.getByLabel("Nova mensagem").fill("Mensagem que deve sobreviver ao recarregar");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(mensagemNaConversa(page, "Mensagem que deve sobreviver ao recarregar")).toBeVisible();

    await page.reload();
    await expect(mensagemNaConversa(page, "Mensagem que deve sobreviver ao recarregar")).toBeVisible();

    await page.getByRole("button", { name: "Restaurar dados de exemplo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Restaurar" }).click();
    await expect(page.getByRole("region", { name: "Conversa" })).toBeVisible();
    await expect(mensagemNaConversa(page, "Mensagem que deve sobreviver ao recarregar")).toHaveCount(0);
  });

  test("funciona no celular, sem rolagem lateral", async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await contexto.newPage();
    await entrarComo(page, "suporte");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: /Atribuídos a mim/ })).toBeVisible();
    await contexto.close();
  });
});
