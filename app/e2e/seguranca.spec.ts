import { expect, test } from "@playwright/test";
import { loginAsStudent } from "./helpers";

// Checagem de segurança da Fase 9 vista pelo navegador. O unit test garante
// que a string do CSP está certa; aqui garantimos que ela **chega** na
// resposta e que a aplicação continua funcionando debaixo dela.
test.describe("cabeçalhos de segurança", () => {
  test("o login responde com CSP com nonce e os cabeçalhos fixos", async ({
    page,
  }) => {
    const response = await page.goto("/login");
    const headers = response?.headers() ?? {};

    expect(headers["content-security-policy"]).toContain("'nonce-");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    // poweredByHeader: false — não entregar a versão do framework de graça.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("cada resposta recebe um nonce próprio", async ({ page }) => {
    const first = await page.goto("/login");
    const second = await page.goto("/login");
    const csp = (r: typeof first) => r?.headers()["content-security-policy"];
    expect(csp(first)).not.toBe(csp(second));
  });

  test("script inline sem nonce no HTML é bloqueado pela política", async ({
    page,
  }) => {
    // Simula XSS refletido injetando o script no HTML **servido**, para que ele
    // passe pelo parser como markup do documento. (`page.evaluate` não serve:
    // roda pelo protocolo de depuração, que não é submetido ao CSP.)
    await page.route("**/login", async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        "</body>",
        "<script>window.__xss__ = true;</script></body>",
      );
      await route.fulfill({ response, body });
    });

    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

    const executed = await page.evaluate(
      () => (window as unknown as { __xss__?: boolean }).__xss__ === true,
    );
    expect(executed).toBe(false);
  });

  test("a área protegida também responde com CSP", async ({ page }) => {
    await loginAsStudent(page);
    const response = await page.goto("/painel");
    expect(response?.headers()["content-security-policy"]).toContain("'nonce-");
  });
});
