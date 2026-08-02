import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/errors";
import {
  INVITE_TTL_DAYS,
  inviteExpiry,
  invitePath,
  inviteStatus,
  MIN_PASSWORD_LENGTH,
  validateInviteEmail,
  validateInvitePassword,
} from "@/lib/invites";

// O convite é a única porta pela qual um administrador novo entra no sistema
// (não há cadastro público). Quem erra aqui cria admin sem querer — por isso
// os limites de tempo e de senha são testados um a um.
const NOW = new Date("2026-08-02T12:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("inviteStatus", () => {
  it("é válido antes de vencer e sem aceite", () => {
    expect(inviteStatus({ acceptedAt: null, expiresAt: days(1) }, NOW)).toBe(
      "valid",
    );
  });

  it("já aceito não volta a ser válido, mesmo dentro do prazo", () => {
    expect(
      inviteStatus({ acceptedAt: days(-1), expiresAt: days(1) }, NOW),
    ).toBe("accepted");
  });

  it("aceite vence prazo: convite aceito e expirado conta como aceito", () => {
    expect(
      inviteStatus({ acceptedAt: days(-3), expiresAt: days(-1) }, NOW),
    ).toBe("accepted");
  });

  it("expira no instante exato do vencimento, não um segundo depois", () => {
    expect(inviteStatus({ acceptedAt: null, expiresAt: NOW }, NOW)).toBe(
      "expired",
    );
    expect(
      inviteStatus(
        { acceptedAt: null, expiresAt: new Date(NOW.getTime() + 1) },
        NOW,
      ),
    ).toBe("valid");
  });
});

describe("inviteExpiry", () => {
  it("vence exatamente em INVITE_TTL_DAYS", () => {
    expect(inviteExpiry(NOW)).toEqual(days(INVITE_TTL_DAYS));
  });
});

describe("invitePath", () => {
  it("monta o caminho público com o token", () => {
    expect(invitePath("abc123")).toBe("/convite/abc123");
  });
});

describe("validateInviteEmail", () => {
  it("normaliza espaço e caixa antes de gravar", () => {
    expect(validateInviteEmail("  Coord.CC@CEA.local ")).toBe(
      "coord.cc@cea.local",
    );
  });

  it("recusa o que não é e-mail, com erro exibível", () => {
    for (const bad of ["sem-arroba", "a@b", "a b@c.com", "@cea.local", ""]) {
      expect(() => validateInviteEmail(bad), bad).toThrow(DomainError);
    }
  });
});

describe("validateInvitePassword", () => {
  it("aceita a partir do comprimento mínimo", () => {
    expect(() =>
      validateInvitePassword("x".repeat(MIN_PASSWORD_LENGTH)),
    ).not.toThrow();
  });

  it("recusa um caractere abaixo do mínimo", () => {
    expect(() =>
      validateInvitePassword("x".repeat(MIN_PASSWORD_LENGTH - 1)),
    ).toThrow(DomainError);
  });

  it("diz ao usuário qual é o mínimo", () => {
    expect(() => validateInvitePassword("123")).toThrow(
      String(MIN_PASSWORD_LENGTH),
    );
  });
});
