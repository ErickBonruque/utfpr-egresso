import { expect, test } from "@playwright/test";
import { loginAsStudent } from "./helpers";

// Superfície pública do deploy (Fase 10): o que um visitante deslogado
// alcança, e o que o smoke test do deploy usa para dizer "está de pé".
test.describe("entrada pública", () => {
  test("a home apresenta o sistema e leva ao login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Entrar com o RA" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a home não expõe o inventário da instituição a quem não logou", async ({
    page,
  }) => {
    const body = (await (await page.goto("/"))?.text()) ?? "";
    // A tela da Fase 2 listava campi e a contagem de disciplinas de cada
    // curso. Nada disso pode voltar sem sessão.
    expect(body).not.toContain("disciplinas</span>");
    expect(body).not.toContain("Nenhum campus encontrado");
  });

  test("quem já tem sessão vai direto para o seu lugar", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/painel/);
  });

  test("a sonda de saúde responde ok com o banco de pé", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
    // Sonda pública não entrega detalhe de infraestrutura.
    expect(JSON.stringify(body)).not.toContain("postgres");
  });

  test("404 tem a cara do sistema, não a tela crua do Next", async ({
    page,
  }) => {
    await page.goto("/rota-que-nao-existe");
    await expect(
      page.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
  });
});
