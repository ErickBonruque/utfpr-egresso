import { describe, expect, it } from "vitest";
import { checkEnvironment, fatalIssues } from "@/lib/env-check";
import {
  buildContentSecurityPolicy,
  HSTS_HEADER,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security-headers";

const VALID_SECRET = "K7d2mQx9fT4bR1sY6zN8vC3jL5wH0pA2eU4iO7gX1kM=";

const PRODUCTION_ENV = {
  DATABASE_URL: "postgresql://cea:senha@db.interno:5432/cea",
  BETTER_AUTH_SECRET: VALID_SECRET,
  BETTER_AUTH_URL: "https://cea.utfpr.edu.br",
  ADZUNA_APP_ID: "id",
  ADZUNA_APP_KEY: "key",
};

function directive(csp: string, name: string): string {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) throw new Error(`CSP sem a diretiva ${name}: ${csp}`);
  return found;
}

describe("checkEnvironment", () => {
  it("aprova um ambiente de produção completo", () => {
    expect(checkEnvironment(PRODUCTION_ENV, true)).toEqual([]);
  });

  it("barra o segredo de exemplo do .env.example", () => {
    const issues = checkEnvironment(
      { ...PRODUCTION_ENV, BETTER_AUTH_SECRET: "change-me" },
      true,
    );
    expect(fatalIssues(issues).map((i) => i.variable)).toEqual([
      "BETTER_AUTH_SECRET",
    ]);
  });

  it("barra segredo curto demais para assinar sessão", () => {
    const issues = checkEnvironment(
      { ...PRODUCTION_ENV, BETTER_AUTH_SECRET: "abc123" },
      true,
    );
    expect(fatalIssues(issues)).toHaveLength(1);
  });

  it("exige https na URL de produção (o cookie de sessão é Secure)", () => {
    const issues = checkEnvironment(
      { ...PRODUCTION_ENV, BETTER_AUTH_URL: "http://cea.utfpr.edu.br" },
      true,
    );
    expect(fatalIssues(issues).map((i) => i.variable)).toEqual([
      "BETTER_AUTH_URL",
    ]);
  });

  it("libera http em loopback — é o smoke test do build de produção", () => {
    for (const url of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      expect(
        fatalIssues(
          checkEnvironment({ ...PRODUCTION_ENV, BETTER_AUTH_URL: url }, true),
        ),
        url,
      ).toEqual([]);
    }
  });

  it("exige a conexão da UTFPR quando o provider real está escolhido", () => {
    const issues = checkEnvironment(
      { ...PRODUCTION_ENV, ACADEMIC_PROVIDER: "utfpr" },
      true,
    );
    expect(fatalIssues(issues).map((i) => i.variable)).toEqual([
      "UTFPR_DATABASE_URL",
    ]);
  });

  it("aceita o provider seed sem exigir nada da UTFPR", () => {
    expect(
      checkEnvironment({ ...PRODUCTION_ENV, ACADEMIC_PROVIDER: "seed" }, true),
    ).toEqual([]);
  });

  it("trata vagas sem credencial como aviso, não como impedimento", () => {
    const issues = checkEnvironment(
      {
        ...PRODUCTION_ENV,
        ADZUNA_APP_ID: undefined,
        ADZUNA_APP_KEY: undefined,
      },
      true,
    );
    expect(fatalIssues(issues)).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });

  it("fora de produção nada é fatal — dev roda com os defaults do compose", () => {
    const issues = checkEnvironment({}, false);
    expect(issues.length).toBeGreaterThan(0);
    expect(fatalIssues(issues)).toEqual([]);
  });
});

describe("buildContentSecurityPolicy", () => {
  const prod = buildContentSecurityPolicy({
    nonce: "abc123",
    isDevelopment: false,
  });

  it("assina os scripts pelo nonce da resposta", () => {
    expect(directive(prod, "script-src")).toContain("'nonce-abc123'");
  });

  it("não libera inline nem eval para script em produção", () => {
    const scriptSrc = directive(prod, "script-src");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("bloqueia embutir o sistema em iframe de terceiro", () => {
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
  });

  it("prende formulário e base ao próprio domínio", () => {
    expect(directive(prod, "form-action")).toBe("form-action 'self'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
  });

  it("força https só em produção", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(
      buildContentSecurityPolicy({ nonce: "x", isDevelopment: true }),
    ).not.toContain("upgrade-insecure-requests");
  });

  it("abre eval e websocket apenas no next dev", () => {
    const dev = buildContentSecurityPolicy({
      nonce: "x",
      isDevelopment: true,
    });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
  });

  it("gera nonce diferente por resposta", () => {
    const a = buildContentSecurityPolicy({ nonce: "n1", isDevelopment: false });
    const b = buildContentSecurityPolicy({ nonce: "n2", isDevelopment: false });
    expect(a).not.toBe(b);
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  const byKey = new Map(STATIC_SECURITY_HEADERS.map((h) => [h.key, h.value]));

  it("cobre os cabeçalhos fixos da revisão de segurança", () => {
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(byKey.get("Permissions-Policy")).toContain("camera=()");
  });

  it("não inclui HSTS na lista fixa (dev é http://localhost)", () => {
    expect(byKey.has("Strict-Transport-Security")).toBe(false);
    expect(HSTS_HEADER.value).toContain("max-age=63072000");
  });
});
