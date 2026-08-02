import { expect, test } from "@playwright/test";
import { failOnCspViolation, loginAsStudent } from "./helpers";

// Fluxo principal do aluno (Fase 6): entrar, ver progresso, navegar pelo menu
// do portal. As telas são Server Components pesados (engine de gamificação +
// React Flow), então também servem de sonda para o CSP com nonce da Fase 9 —
// se a política quebrasse o hydrate, a árvore não renderizaria.
test.describe("portal do aluno", () => {
  test("painel mostra progresso, nível e mapa curricular", async ({ page }) => {
    const assertNoCspViolation = failOnCspViolation(page);
    await loginAsStudent(page);

    await expect(
      page.getByRole("heading", { name: /Olá, Erick/ }),
    ).toBeVisible();
    await expect(page.getByText("Progresso no curso")).toBeVisible();
    await expect(page.getByText("Nível & XP")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mapa curricular" }),
    ).toBeVisible();
    assertNoCspViolation();
  });

  test("menu do portal leva às quatro telas do aluno", async ({ page }) => {
    await loginAsStudent(page);

    await page.getByRole("link", { name: "Árvore", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Árvore de carreiras" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Conquistas", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Conquistas", exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Vagas", exact: true }).click();
    await expect(page).toHaveURL(/\/vagas/);

    await page.getByRole("link", { name: "Perfil", exact: true }).click();
    await expect(page).toHaveURL(/\/perfil/);
  });

  test("aluno não entra na administração", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/admin");
    // requireAdmin devolve o aluno ao portal em vez de mostrar o painel.
    await expect(page).toHaveURL(/\/painel/);
  });

  test("aluno não vê a aba de egresso no perfil", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/perfil");
    await expect(page.getByRole("tab", { name: "Visão geral" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Egresso" })).toHaveCount(0);
  });
});
