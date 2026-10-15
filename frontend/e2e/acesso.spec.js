import { test, expect } from "@playwright/test";
import { entrarComo, aviso } from "./apoio";

test.describe("Acesso", () => {
  test("entra com e-mail e senha", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("E-mail").fill("suporte@helpdesk.com");
    await page.getByLabel("Senha", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/chamados/);
    await expect(page.getByRole("heading", { name: "Fila de chamados" })).toBeVisible();
  });

  test("mostra a mesma mensagem para senha errada", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("E-mail").fill("usuario@helpdesk.com");
    await page.getByLabel("Senha", { exact: true }).fill("errada");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(aviso(page, "E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("conta desativada não entra", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("E-mail").fill("ana@helpdesk.com");
    await page.getByLabel("Senha", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(aviso(page, "Conta desativada")).toBeVisible();
  });

  test("cadastro entra direto como colaborador", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Nome completo").fill("Visitante Teste");
    await page.getByLabel("E-mail corporativo").fill("visitante@empresa.com");
    await page.getByLabel("Senha", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByRole("heading", { name: "Meus chamados" })).toBeVisible();
    await expect(page.getByText("Colaborador", { exact: true })).toBeVisible();
  });

  test("sem login, qualquer página volta para a tela de entrada", async ({ page }) => {
    await page.goto("/chamado/3");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("colaborador não vê a administração nem chamados de outras pessoas", async ({ page }) => {
    await entrarComo(page, "colaborador");
    await expect(page.getByRole("link", { name: "Administração" })).toHaveCount(0);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/chamados/);

    await page.goto("/chamado/3");
    await expect(aviso(page, "Acesso negado a este chamado.")).toBeVisible();
    await expect(page).toHaveURL(/\/chamados/);
  });
});
