// Funções usadas pelos testes de interface
import { expect } from "@playwright/test";

const BOTAO_DA_CONTA = { colaborador: "Colaborador", suporte: "Suporte", admin: "Administrador" };

// Entra pela conta de demonstração da tela de login
export async function entrarComo(page, perfil) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`^${BOTAO_DA_CONTA[perfil]}`) }).click();
  await expect(page).toHaveURL(/\/chamados/);
  await expect(page.locator("main ul > li").first()).toBeVisible();
}

// Linhas da lista de chamados
export const linhas = (page) => page.locator("main ul > li");

export const aviso = (page, texto) => page.getByText(texto, { exact: false }).first();

// Mensagem já publicada na conversa (não confunde com o texto ainda no campo de digitação)
export const mensagemNaConversa = (page, texto) =>
  page.getByRole("region", { name: "Conversa" }).getByRole("listitem").filter({ hasText: texto });
