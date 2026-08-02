import { describe, expect, it } from "vitest";
import {
  buildLogRecord,
  describeError,
  formatLogRecord,
  isLogLevel,
  isSensitiveKey,
  type LogRecord,
  maskUrlCredentials,
  REDACTED,
  redactContext,
  shouldLog,
} from "@/lib/logging";

const AT = new Date("2026-08-02T12:00:00.000Z");

describe("shouldLog", () => {
  it("deixa passar o próprio nível e os acima", () => {
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("error", "info")).toBe(true);
  });

  it("corta os níveis abaixo do mínimo", () => {
    expect(shouldLog("debug", "info")).toBe(false);
    expect(shouldLog("warn", "error")).toBe(false);
  });

  it("reconhece só os quatro níveis válidos", () => {
    expect(isLogLevel("warn")).toBe(true);
    expect(isLogLevel("verbose")).toBe(false);
    expect(isLogLevel(undefined)).toBe(false);
  });
});

describe("isSensitiveKey", () => {
  it("pega a chave em qualquer notação", () => {
    for (const key of [
      "password",
      "newPassword",
      "senha",
      "BETTER_AUTH_SECRET",
      "app_key",
      "apiKey",
      "Authorization",
      "cookie",
      "passwordHash",
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it("não confunde campo comum com segredo", () => {
    for (const key of ["ra", "email", "courseId", "keyword", "name"]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe("maskUrlCredentials", () => {
  it("apaga usuário e senha da connection string, preservando host", () => {
    expect(
      maskUrlCredentials(
        "postgresql://cea:cea_dev_password@localhost:5432/cea",
      ),
    ).toBe(`postgresql://${REDACTED}@localhost:5432/cea`);
  });

  it("não mexe em URL sem credencial", () => {
    const url = "https://api.adzuna.com/v1/api/jobs/br/search/1";
    expect(maskUrlCredentials(url)).toBe(url);
  });
});

describe("redactContext", () => {
  it("substitui o valor sensível e mantém o resto", () => {
    expect(
      redactContext({ ra: "a2587246", password: "@teste123", attempt: 2 }),
    ).toEqual({ ra: "a2587246", password: REDACTED, attempt: 2 });
  });

  it("desce em objeto aninhado", () => {
    expect(
      redactContext({ user: { email: "a@b.c", credentials: { token: "x" } } }),
    ).toEqual({ user: { email: "a@b.c", credentials: REDACTED } });
  });

  it("limita a profundidade em vez de estourar a pilha", () => {
    const deep = { a: { b: { c: { d: { e: "fundo" } } } } };
    expect(redactContext(deep)).toEqual({
      a: { b: { c: { d: "[truncated]" } } },
    });
  });

  it("corta array longo e diz quantos ficaram de fora", () => {
    const out = redactContext({ ras: Array.from({ length: 25 }, (_, i) => i) });
    const ras = (out.ras as unknown[]) ?? [];
    expect(ras).toHaveLength(21);
    expect(ras.at(-1)).toBe("…+5");
  });

  it("serializa Date e Error em vez de virar objeto vazio", () => {
    const out = redactContext({ at: AT, boom: new Error("falhou") });
    expect(out.at).toBe("2026-08-02T12:00:00.000Z");
    expect((out.boom as { message: string }).message).toBe("falhou");
  });
});

describe("describeError", () => {
  it("normaliza Error com nome, mensagem e stack", () => {
    const shape = describeError(new TypeError("valor inválido"));
    expect(shape.name).toBe("TypeError");
    expect(shape.message).toBe("valor inválido");
    expect(shape.stack).toContain("TypeError");
  });

  it("normaliza o que não é Error", () => {
    expect(describeError("string solta")).toEqual({
      name: "NonError",
      message: "string solta",
    });
  });

  it("mascara credencial que veio dentro da mensagem do driver", () => {
    const shape = describeError(
      new Error("connect ECONNREFUSED postgresql://cea:senha@db:5432/cea"),
    );
    expect(shape.message).not.toContain("senha");
    expect(shape.message).toContain(REDACTED);
  });

  it("segue a cadeia de cause", () => {
    const shape = describeError(
      new Error("falha ao sincronizar", { cause: new Error("timeout") }),
    );
    expect((shape.cause as { message: string }).message).toBe("timeout");
  });
});

describe("buildLogRecord", () => {
  it("monta o cabeçalho fixo mais o contexto", () => {
    expect(
      buildLogRecord("info", "sync.started", { provider: "seed" }, AT),
    ).toEqual({
      ts: "2026-08-02T12:00:00.000Z",
      level: "info",
      event: "sync.started",
      provider: "seed",
    });
  });

  it("não deixa o contexto sobrescrever ts/level/event", () => {
    const record = buildLogRecord(
      "warn",
      "real",
      { event: "falso", level: "debug", ts: "ontem", ra: "a1" },
      AT,
    );
    expect(record.event).toBe("real");
    expect(record.level).toBe("warn");
    expect(record.ts).toBe("2026-08-02T12:00:00.000Z");
    expect(record.ra).toBe("a1");
  });
});

describe("formatLogRecord", () => {
  const record: LogRecord = {
    ts: "2026-08-02T12:00:00.000Z",
    level: "error",
    event: "sync.student_failed",
    ra: "a2587246",
  };

  it("em produção emite uma linha JSON parseável", () => {
    expect(JSON.parse(formatLogRecord(record, false))).toEqual(record);
  });

  it("em dev emite linha legível com o contexto ao lado", () => {
    expect(formatLogRecord(record, true)).toBe(
      '2026-08-02T12:00:00.000Z ERROR sync.student_failed {"ra":"a2587246"}',
    );
  });

  it("omite o objeto vazio quando não há contexto", () => {
    expect(
      formatLogRecord(buildLogRecord("info", "sync.started", {}, AT), true),
    ).toBe("2026-08-02T12:00:00.000Z INFO  sync.started");
  });
});
