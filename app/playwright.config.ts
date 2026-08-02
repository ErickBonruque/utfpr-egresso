import { defineConfig, devices } from "@playwright/test";

// E2E da Fase 9. Complementa o vitest, que cobre regra pura: aqui o alvo são
// os fluxos que só existem com navegador + servidor + banco juntos (sessão,
// proxy, server action, CSP).
//
// `workers: 1` de propósito: as specs escrevem no mesmo banco de dev (ativar
// vitrine, criar campus). Paralelizar deixaria o resultado dependente da
// ordem — e teste E2E instável é pior que teste E2E ausente.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    // O Erick costuma deixar um `next dev` de pé; o Next 16 recusa um segundo.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
