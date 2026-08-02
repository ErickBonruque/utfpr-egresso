import { expect, type Page } from "@playwright/test";

// Credenciais do seed (.planning/LOGINS_MOCK.md). Continuam válidas depois do
// deploy: enquanto a integração UTFPR não existe, é por elas que o sistema é
// demonstrado e testado.
export const STUDENT = { ra: "a2587246", password: "@teste123" };
export const GRADUATE = { ra: "a2190001", password: "@teste123" };
export const SUPER_ADMIN = { email: "admin@cea.local", password: "@admin123" };
export const COURSE_ADMIN = {
  email: "coord.cc@cea.local",
  password: "@admin123",
};

export async function loginAsStudent(
  page: Page,
  who: { ra: string; password: string } = STUDENT,
) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Aluno / Egresso" }).click();
  await page.getByLabel("RA (Registro Acadêmico)").fill(who.ra);
  await page.getByLabel("Senha").fill(who.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/painel");
}

export async function loginAsAdmin(
  page: Page,
  who: { email: string; password: string } = SUPER_ADMIN,
) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Administração" }).click();
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Senha").fill(who.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /sair/i }).click();
  await page.waitForURL("**/login");
}

/// Falha o teste se o navegador tiver bloqueado algo pelo CSP — é assim que a
/// política vira verificação real em vez de string bonita no header.
export function failOnCspViolation(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Content Security Policy")) violations.push(text);
  });
  return () => expect(violations, violations.join("\n")).toEqual([]);
}
