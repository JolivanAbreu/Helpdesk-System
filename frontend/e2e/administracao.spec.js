import { test, expect } from "@playwright/test";
import { entrarComo, aviso, escolher } from "./apoio";

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

  test("mostra a fila de cada grupo técnico", async ({ page }) => {
    await expect(page.getByText("Fila por grupo")).toBeVisible();
    const linha = page.getByRole("row", { name: /Infraestrutura \(N2\)/ });
    await expect(linha).toContainText("3");
    await linha.getByRole("link").click();
    await expect(page).toHaveURL(/\/chamados\?grupo=2/);
  });

  test("edita uma subcategoria do catálogo e o próximo chamado já segue a regra nova", async ({ page }) => {
    await page.getByRole("button", { name: "Catálogo" }).click();
    await page.getByRole("button", { name: "Editar Hardware › Monitor e vídeo" }).click();

    const janela = page.getByRole("dialog", { name: "Editar subcategoria" });
    await janela.getByLabel("Prioridade").selectOption("critica");
    await janela.getByLabel("Primeira resposta (horas)").fill("0.5");
    await janela.getByLabel("Solução (horas)").fill("3");
    await janela.getByRole("button", { name: "Salvar" }).click();
    await expect(aviso(page, "Catálogo atualizado.")).toBeVisible();
    const linha = page.getByRole("row", { name: /Monitor e vídeo/ });
    await expect(linha).toContainText("Crítica");
    await expect(linha).toContainText("30 min");

    await page.keyboard.press("n");
    const novo = page.getByRole("dialog", { name: "Novo chamado" });
    await escolher(novo, /^Hardware/);
    await escolher(novo, /^Monitor e vídeo/);
    await expect(novo).toContainText("Resposta em até 30 min");
    await expect(novo).toContainText("solução em até 3 h");
  });

  test("cria um grupo técnico com membros", async ({ page }) => {
    await page.getByRole("button", { name: "Grupos" }).click();
    await expect(page.getByRole("region", { name: "Service Desk (N1)" })).toContainText("Rafael Costa");
    await page.getByRole("button", { name: "Novo grupo" }).click();

    const janela = page.getByRole("dialog", { name: "Novo grupo" });
    await janela.getByLabel("Nome").fill("Field Service");
    await janela.getByRole("checkbox", { name: /Carlos Lima/ }).check();
    await janela.getByRole("button", { name: "Criar grupo" }).click();

    await expect(aviso(page, 'Grupo "Field Service" criado.')).toBeVisible();
    await expect(page.getByRole("region", { name: "Field Service" })).toContainText("Carlos Lima");
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
