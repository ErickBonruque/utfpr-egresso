import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsStudent, logout, STUDENT } from "./helpers";

// O portão de acesso é a peça em que um erro custa mais caro: um furo aqui
// expõe histórico acadêmico de terceiros. Cada caso abaixo é uma regra da
// Fase 3 vista pelo lado do navegador.
test.describe("autenticação e portão de acesso", () => {
  for (const path of [
    "/painel",
    "/arvore",
    "/conquistas",
    "/perfil",
    "/egressos",
    "/vagas",
    "/admin",
  ]) {
    test(`deslogado em ${path} vai para o login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("RA e senha corretos abrem o painel do aluno", async ({ page }) => {
    await loginAsStudent(page);
    await expect(
      page.getByRole("heading", { name: /Olá, Erick/ }),
    ).toBeVisible();
  });

  test("senha errada não entra e não revela se o RA existe", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Aluno / Egresso" }).click();
    await page.getByLabel("RA (Registro Acadêmico)").fill(STUDENT.ra);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("RA ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("e-mail e senha de admin abrem o painel administrativo", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("sair encerra a sessão de verdade (voltar não devolve o painel)", async ({
    page,
  }) => {
    await loginAsStudent(page);
    await logout(page);

    await page.goto("/painel");
    await expect(page).toHaveURL(/\/login/);
  });
});
