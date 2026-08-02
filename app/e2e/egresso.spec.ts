import { expect, test } from "@playwright/test";
import { GRADUATE, loginAsStudent, STUDENT } from "./helpers";

// Fluxo do egresso (Fase 7). O caso que importa é o de privacidade: a vitrine
// só publica quem marcou "Aparecer na vitrine". O teste liga e desliga o
// toggle e confere o reflexo em /egressos — ida e volta, para o banco não
// ficar sujo para a próxima execução.
test.describe("portal do egresso e vitrine", () => {
  test("egressa vê o card de egresso e a aba Egresso no perfil", async ({
    page,
  }) => {
    await loginAsStudent(page, GRADUATE);
    await expect(
      page.getByRole("heading", { name: /Olá, Mariana/ }),
    ).toBeVisible();

    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Egresso" }).click();
    await expect(
      page.getByRole("heading", { name: "Perfil profissional" }),
    ).toBeVisible();
    await expect(page.getByLabel("Empresa atual")).toBeVisible();
  });

  test("o toggle da vitrine decide se o perfil é publicado", async ({
    page,
  }) => {
    await loginAsStudent(page, GRADUATE);
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Egresso" }).click();

    const showcase = page.getByRole("checkbox", {
      name: "Aparecer na vitrine de egressos",
    });
    await expect(showcase).toBeChecked();

    // Sai da vitrine…
    await showcase.click();
    await page
      .getByRole("button", { name: /Salvar perfil de egresso/ })
      .click();
    await expect(page.getByRole("button", { name: /^Salvar/ })).toBeEnabled();

    await page.goto("/egressos");
    await expect(page.getByText("Mariana Souza Campos")).toHaveCount(0);

    // …e volta, para o banco ficar como estava.
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Egresso" }).click();
    await page
      .getByRole("checkbox", { name: "Aparecer na vitrine de egressos" })
      .click();
    await page
      .getByRole("button", { name: /Salvar perfil de egresso/ })
      .click();
    await expect(page.getByRole("button", { name: /^Salvar/ })).toBeEnabled();

    await page.goto("/egressos");
    await expect(page.getByText("Mariana Souza Campos")).toBeVisible();
  });

  test("aluno logado navega a vitrine sem perder o menu do portal", async ({
    page,
  }) => {
    await loginAsStudent(page, STUDENT);
    await page.getByRole("link", { name: "Egressos", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Egressos" })).toBeVisible();
    // O chrome do portal continua de pé (regressão corrigida em 8bc04dc).
    await expect(page.getByRole("link", { name: "Início" })).toBeVisible();
    await expect(page.getByText("Mariana Souza Campos")).toBeVisible();
  });

  test("a busca da vitrine filtra os egressos", async ({ page }) => {
    await loginAsStudent(page, STUDENT);
    await page.goto("/egressos");

    const search = page.getByPlaceholder(
      "Buscar por nome, empresa, cargo, área…",
    );
    await search.fill("Mariana");
    await expect(page.getByText("Mariana Souza Campos")).toBeVisible();

    await search.fill("zzzz-nao-existe");
    await expect(page.getByText("Mariana Souza Campos")).toHaveCount(0);
  });
});
