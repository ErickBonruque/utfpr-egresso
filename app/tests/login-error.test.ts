// Mensagem de erro do login (05/08/2026). O caso que motivou o teste: passado
// o freio de 30 tentativas/min, o formulário dizia "RA ou senha incorretos"
// mesmo para a senha certa, e o usuário concluiu que os logins tinham parado
// de funcionar.
import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "../src/app/login/login-form";

describe("loginErrorMessage", () => {
  it("429 avisa que é bloqueio temporário, não credencial errada", () => {
    for (const mode of ["student", "admin"] as const) {
      const msg = loginErrorMessage(429, mode);
      expect(msg).toMatch(/aguarde/i);
      expect(msg).not.toMatch(/incorret/i);
    }
  });

  it("401 permanece genérico e não revela se o RA existe", () => {
    expect(loginErrorMessage(401, "student")).toBe("RA ou senha incorretos.");
    expect(loginErrorMessage(401, "admin")).toBe("E-mail ou senha incorretos.");
  });

  it("erro desconhecido cai na mensagem genérica", () => {
    expect(loginErrorMessage(500, "student")).toMatch(/incorretos/);
  });
});
