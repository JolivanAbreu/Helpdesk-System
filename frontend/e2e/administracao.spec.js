import { test, expect } from "@playwright/test";
import { entrarComo, aviso } from "./apoio";

test.describe("Administração", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "admin");
    await page.getByRole("link", { name: "Administração" }).click();
    await expect(page.getByText("Chamados nos últimos 14 dias")).toBeVisible();
  });

  test("mostra os indicadores e o gráfico também como tabela", async ({ page }) => {
    const indicadores = page.getByRole("region", { name: "Indicadores" });
    await expect(indicadores).toContainText("Pendentes");
    await expect(indicadores).toContainText("3 sem responsável");
    await expect(indicadores).toContainText("Tempo médio de 13 h");
    await expect(indicadores).toContainText("Com prazo estourado");
    await expect(indicadores).toContainText("82%");
    await expect(page.getByText("Chamados por categoria")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "No prazo" })).toBeVisible();

    await page.getByRole("button", { name: "Ver tabela" }).click();
    await expect(page.getByRole("columnheader", { name: "Dia" })).toBeVisible();
  });

  test("cria um técnico de suporte", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários" }).click();
    await page.getByRole("button", { name: "Novo usuário" }).click();

    const janela = page.getByRole("dialog", { name: "Novo usuário" });
    await janela.getByLabel("Nome completo").fill("Bruno Técnico");
    await janela.getByLabel("E-mail").fill("bruno@empresa.com");
    await janela.getByLabel("Senha inicial").fill("123456");
    await janela.getByRole("button", { name: "Criar usuário" }).click();

    await expect(aviso(page, "Bruno Técnico cadastrado como suporte.")).toBeVisible();
    await expect(page.getByRole("row", { name: /Bruno Técnico/ })).toBeVisible();
  });

  test("desativa uma conta pela janela de confirmação e reativa", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários" }).click();
    const linha = page.getByRole("row", { name: /juliana@helpdesk\.com/ });
    await linha.getByRole("button", { name: "Desativar" }).click();

    const confirmar = page.getByRole("dialog", { name: "Desativar a conta de Juliana Rocha?" });
    await confirmar.getByRole("button", { name: "Desativar conta" }).click();
    await expect(aviso(page, "Conta de Juliana Rocha desativada.")).toBeVisible();

    await linha.getByRole("button", { name: "Reativar" }).click();
    await expect(aviso(page, "Conta de Juliana Rocha reativada.")).toBeVisible();
  });

  test("não deixa o admin mudar o próprio perfil", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários" }).click();
    await expect(page.getByLabel("Perfil de Marina Alves")).toBeDisabled();
  });
});
