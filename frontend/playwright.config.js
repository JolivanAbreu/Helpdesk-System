// Testes de interface (Playwright).
// Rodam contra o build da demonstração: a API é simulada no navegador,
// então não precisam de backend nem de banco de dados.
//
//   npm run test:e2e                  roda todos
//   npx playwright test --ui          abre o modo visual
import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Permite usar um Chromium já instalado (PW_CHROMIUM_PATH) em vez do baixado pelo Playwright
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npm run build:demo && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !CI,
    timeout: 180000,
  },
});
