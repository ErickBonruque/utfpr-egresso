import { describe, expect, it } from "vitest";
import {
  allowsMockLogins,
  environmentNotice,
  readEnvironmentKind,
} from "@/lib/environment";

describe("readEnvironmentKind", () => {
  it("respeita a declaração explícita", () => {
    expect(readEnvironmentKind({ CEA_ENVIRONMENT: "demo" })).toBe("demo");
    expect(readEnvironmentKind({ CEA_ENVIRONMENT: "producao" })).toBe(
      "producao",
    );
    expect(readEnvironmentKind({ CEA_ENVIRONMENT: "production" })).toBe(
      "producao",
    );
  });

  it("ignora caixa e espaço em volta", () => {
    expect(readEnvironmentKind({ CEA_ENVIRONMENT: "  DEMO " })).toBe("demo");
  });

  it("a declaração vence o NODE_ENV — é o caso deste deploy", () => {
    expect(
      readEnvironmentKind({
        CEA_ENVIRONMENT: "demo",
        NODE_ENV: "production",
      }),
    ).toBe("demo");
  });

  it("sem declaração, cai no NODE_ENV", () => {
    expect(readEnvironmentKind({ NODE_ENV: "production" })).toBe("producao");
    expect(readEnvironmentKind({ NODE_ENV: "development" })).toBe("local");
    expect(readEnvironmentKind({})).toBe("local");
  });
});

describe("environmentNotice", () => {
  it("demo avisa que os dados são fictícios", () => {
    const notice = environmentNotice("demo");
    expect(notice?.label).toContain("demonstração");
    expect(notice?.message).toContain("fictícios");
  });

  it("produção não ganha faixa", () => {
    expect(environmentNotice("producao")).toBeNull();
  });

  it("local avisa, mas sem alarme", () => {
    expect(environmentNotice("local")).not.toBeNull();
  });
});

describe("allowsMockLogins", () => {
  it("logins de teste valem em demo e local, não em produção", () => {
    expect(allowsMockLogins("demo")).toBe(true);
    expect(allowsMockLogins("local")).toBe(true);
    expect(allowsMockLogins("producao")).toBe(false);
  });
});
