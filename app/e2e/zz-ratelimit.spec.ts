import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { Client } from "pg";

// Regressão de 05/08/2026. O formulário de login devolvia "RA ou senha
// incorretos" para qualquer falha — inclusive o 429 do freio de força bruta
// (30 tentativas/min, src/server/auth.ts). Passado o limite, quem digitava a
// senha CERTA continuava lendo que ela estava errada e concluía que a conta
// tinha parado de funcionar. Foi exatamente o que aconteceu.
//
// Roda por último de propósito (prefixo zz): estourar o freio é o ponto do
// teste. O afterAll zera a tabela porque o contador dura 60s — sem limpar,
// rodar a suíte duas vezes seguidas faria os testes de autenticação da
// segunda rodada baterem em 429. Vai por `pg` e não pelo Prisma Client: o
// runner do Playwright não carrega o client gerado (ESM/CJS).

config({ path: ".env", quiet: true });

test.afterAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DELETE FROM rate_limits");
  await client.end();
});

test("sob bloqueio, o login avisa que é tentativa demais e não credencial errada", async ({
  page,
  request,
}) => {
  for (let i = 0; i < 32; i++) {
    await request.post("/api/auth/sign-in/username", {
      data: { username: "a2587246", password: "errada" },
      failOnStatusCode: false,
    });
  }

  await page.goto("/login");
  await page.getByRole("button", { name: "Aluno / Egresso" }).click();
  await page.getByLabel("RA (Registro Acadêmico)").fill("a2587246");
  await page.getByLabel("Senha").fill("@teste123"); // a senha CERTA
  await page.getByRole("button", { name: "Entrar" }).click();

  // A mensagem precisa dizer que é temporário — e não acusar a credencial.
  await expect(page.getByText(/Aguarde um minuto/i)).toBeVisible();
  await expect(page.getByText("RA ou senha incorretos.")).toHaveCount(0);
});
