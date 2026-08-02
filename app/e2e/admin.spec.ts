import { expect, test } from "@playwright/test";
import { COURSE_ADMIN, loginAsAdmin, SUPER_ADMIN } from "./helpers";

// Painel admin (Fase 4) + escopo de papéis (Fase 3) + tela de sincronização
// (Fase 8). O CRUD é exercitado de ponta a ponta com um campus descartável:
// criar, editar e excluir na mesma spec deixa o banco como estava.
// A sigla precisa ser 2–4 letras (regra de readCampusForm) — nada de dígito.
const TEMP_CAMPUS = {
  code: "ZTST",
  name: "Campus de teste",
  city: "Testelândia",
};

test.describe("painel admin", () => {
  test("dashboard abre com os números da instituição", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("CRUD de campus: cria, edita e exclui", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/campi");

    await page.getByRole("button", { name: "Novo campus" }).click();
    await page.getByLabel("Sigla").fill(TEMP_CAMPUS.code);
    await page.getByLabel("Nome").fill(TEMP_CAMPUS.name);
    await page.getByLabel("Cidade").fill(TEMP_CAMPUS.city);
    await page.getByRole("button", { name: "Criar campus" }).click();

    const row = page.getByRole("row", { name: new RegExp(TEMP_CAMPUS.code) });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Cidade").fill("Testelândia do Sul");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.getByRole("row", { name: /Testelândia do Sul/ }),
    ).toBeVisible();

    await page
      .getByRole("row", { name: new RegExp(TEMP_CAMPUS.code) })
      .getByRole("button", { name: "Excluir" })
      .click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(
      page.getByRole("row", { name: new RegExp(TEMP_CAMPUS.code) }),
    ).toHaveCount(0);
  });

  test("validação do formulário volta em pt-BR, sem texto de exceção", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/campi");

    await page.getByRole("button", { name: "Novo campus" }).click();
    // O input tem maxLength=4, então a sigla inválida também precisa caber
    // nele — o que reprova aqui é o dígito, não o tamanho.
    await page.getByLabel("Sigla").fill("Z9");
    await page.getByLabel("Nome").fill("Campus inválido");
    await page.getByLabel("Cidade").fill("Lugar nenhum");
    await page.getByRole("button", { name: "Criar campus" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Sigla inválida");
    // Regra da Fase 9: nada de mensagem de driver/ORM na tela.
    await expect(alert).not.toContainText("prisma");
  });

  test("COURSE_ADMIN não enxerga a gestão de campi", async ({ page }) => {
    await loginAsAdmin(page, COURSE_ADMIN);
    await expect(page.getByRole("link", { name: "Campi" })).toHaveCount(0);
  });

  test("tela de sincronização mostra o histórico da integração", async ({
    page,
  }) => {
    await loginAsAdmin(page, SUPER_ADMIN);
    await page.goto("/admin/sincronizacao");
    await expect(
      page.getByRole("heading", { name: /Sincroniza/ }),
    ).toBeVisible();
  });
});
