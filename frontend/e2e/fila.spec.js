import { test, expect } from "@playwright/test";
import { entrarComo, linhas, aviso } from "./apoio";

test.describe("Fila de chamados", () => {
  test.beforeEach(({ page }) => entrarComo(page, "suporte"));

  test("abas mostram os contadores e filtram a lista", async ({ page }) => {
    const abas = page.getByRole("navigation", { name: "Filtros rápidos" });
    await expect(abas.getByRole("button", { name: /Pendentes\s*6/ })).toBeVisible();
    await expect(linhas(page)).toHaveCount(6);

    await abas.getByRole("button", { name: /Sem responsável/ }).click();
    await expect(page).toHaveURL(/aba=sem-responsavel/);
    await expect(linhas(page)).toHaveCount(3);
  });

  test("a fila começa pelos chamados mais atrasados", async ({ page }) => {
    await expect(linhas(page).first()).toContainText("Computador reiniciando sozinho");
    await expect(linhas(page).first()).toContainText(/Atrasado há/);
    await expect(linhas(page).nth(2)).toContainText("Backup noturno não executado");
    await expect(linhas(page).nth(2)).toContainText(/Vence em/);
  });

  test("a aba Atrasados reúne os chamados com prazo estourado", async ({ page }) => {
    await page.getByRole("navigation", { name: "Filtros rápidos" }).getByRole("button", { name: /Atrasados\s*2/ }).click();
    await expect(page).toHaveURL(/aba=atrasados/);
    await expect(linhas(page)).toHaveCount(2);
    for (const linha of await linhas(page).all()) await expect(linha).toContainText(/Atrasado há/);
  });

  test("filtra por categoria principal (com todas as subcategorias) e por subcategoria", async ({ page }) => {
    await page.getByLabel("Categoria").selectOption({ label: "Rede e internet (todas)" });
    await expect(page).toHaveURL(/categoria=14/);
    await expect(linhas(page)).toHaveCount(2);
    for (const linha of await linhas(page).all()) await expect(linha).toContainText("Rede e internet");

    await page.getByLabel("Categoria").selectOption({ label: "VPN" });
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText("Sem acesso à VPN");
  });

  test("aba e filtro de grupo técnico", async ({ page }) => {
    // Rafael está no Service Desk (N1) e na Infraestrutura (N2): todos os 6 pendentes
    const abas = page.getByRole("navigation", { name: "Filtros rápidos" });
    await abas.getByRole("button", { name: /Do meu grupo\s*6/ }).click();
    await expect(page).toHaveURL(/aba=meu-grupo/);
    await expect(linhas(page)).toHaveCount(6);

    await page.getByLabel("Grupo").selectOption({ label: "Infraestrutura (N2)" });
    await expect(linhas(page)).toHaveCount(3);
    for (const linha of await linhas(page).all()) await expect(linha).toContainText("Infraestrutura (N2)");
  });

  test("assumir pela lista atualiza a aba e o menu lateral", async ({ page }) => {
    await page.getByRole("navigation", { name: "Filtros rápidos" }).getByRole("button", { name: /Sem responsável/ }).click();
    await linhas(page).filter({ hasText: "Telefone IP sem sinal" }).getByRole("button", { name: "Assumir" }).click();

    await expect(aviso(page, "Você assumiu o CH-0006.")).toBeVisible();
    await expect(linhas(page)).toHaveCount(2);
    await expect(page.locator("aside nav").getByRole("link", { name: /Atribuídos a mim\s*3/ })).toBeVisible();
  });

  test("busca pelo código e limpa os filtros", async ({ page }) => {
    await page.getByRole("button", { name: /^Todos/ }).click();
    await page.getByLabel("Buscar chamados").fill("CH-0002");
    await expect(page).toHaveURL(/busca=CH-0002/);
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page)).toContainText("Sem acesso à VPN");

    await page.getByLabel("Buscar chamados").fill("xyzinexistente");
    await expect(page.getByText("Nenhum chamado encontrado")).toBeVisible();
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(linhas(page)).toHaveCount(15);
  });

  test("pagina a lista completa", async ({ page }) => {
    await page.getByRole("button", { name: /^Todos/ }).click();
    await expect(page.getByText("1–15 de 17")).toBeVisible();
    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.getByText("16–17 de 17")).toBeVisible();
    await expect(page.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });
});
