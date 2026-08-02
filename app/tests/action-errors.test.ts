import { afterEach, describe, expect, it, vi } from "vitest";
import { DomainError, isDomainError, userMessage } from "@/lib/errors";
import { actionCatch, GENERIC_ACTION_ERROR } from "@/server/logger";

// Captura o que o logger escreveria, sem poluir a saída do vitest.
function captureLogs() {
  const lines: string[] = [];
  const write = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  for (const method of ["log", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation(write);
  }
  return {
    lines,
    records: () => lines.map((line) => line.trim()),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DomainError", () => {
  it("é reconhecido como erro de regra de negócio", () => {
    const error = new DomainError("Sem permissão para gerenciar este curso.");
    expect(isDomainError(error)).toBe(true);
    expect(userMessage(error)).toBe("Sem permissão para gerenciar este curso.");
  });

  it("não confunde erro técnico com regra de negócio", () => {
    expect(isDomainError(new TypeError("undefined is not a function"))).toBe(
      false,
    );
    expect(userMessage(new Error("connect ECONNREFUSED"))).toBeNull();
  });
});

describe("actionCatch", () => {
  it("devolve a mensagem do DomainError para a tela", () => {
    const capture = captureLogs();
    const result = actionCatch(
      "action.delete_course",
      new DomainError("Este curso tem 3 aluno(s) — não pode ser excluído."),
      "Não foi possível excluir o curso.",
    );
    expect(result).toEqual({
      error: "Este curso tem 3 aluno(s) — não pode ser excluído.",
    });
    // Regra de negócio negada não é incidente: no máximo rastro em debug.
    expect(capture.records().every((line) => !line.includes("ERROR"))).toBe(
      true,
    );
  });

  it("esconde o erro inesperado do usuário e manda o detalhe para o log", () => {
    const capture = captureLogs();
    const result = actionCatch(
      "action.update_course",
      new Error(
        'Invalid `prisma.course.update()`: Unique constraint failed on the fields: ("name")',
      ),
      "Não foi possível salvar o curso.",
      { courseId: "c1" },
    );

    expect(result).toEqual({ error: "Não foi possível salvar o curso." });
    expect(result.error).not.toContain("prisma");

    const logged = capture.records().join("\n");
    expect(logged).toContain("action.update_course");
    expect(logged).toContain("Unique constraint failed");
    expect(logged).toContain("c1");
  });

  it("usa a mensagem genérica quando o chamador não escolhe uma", () => {
    captureLogs();
    expect(actionCatch("action.qualquer", new Error("boom"))).toEqual({
      error: GENERIC_ACTION_ERROR,
    });
  });

  it("nunca deixa segredo do contexto chegar ao log", () => {
    const capture = captureLogs();
    actionCatch("action.accept_invite", new Error("boom"), "falhou", {
      email: "novo@cea.local",
      password: "@senha-secreta",
    });

    const logged = capture.records().join("\n");
    expect(logged).toContain("novo@cea.local");
    expect(logged).not.toContain("@senha-secreta");
  });
});
