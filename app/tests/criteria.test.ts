// Achievement criteria contract (Fase 4 builder + Fase 6 engine).
import { describe, expect, it } from "vitest";
import {
  CriteriaError,
  describeCriteria,
  parseCriteriaInput,
  validateCriteria,
} from "../src/lib/criteria";

describe("validateCriteria", () => {
  it("accepts subjects_approved with codes and min", () => {
    const criteria = validateCriteria({
      type: "subjects_approved",
      subjectCodes: ["CC1A", "CC1B"],
      min: 2,
    });
    expect(criteria).toEqual({
      type: "subjects_approved",
      subjectCodes: ["CC1A", "CC1B"],
      min: 2,
    });
  });

  it("accepts subjects_approved_count", () => {
    expect(
      validateCriteria({ type: "subjects_approved_count", min: 10 }),
    ).toEqual({ type: "subjects_approved_count", min: 10 });
  });

  // ── Fase 6.2: novos tipos ────────────────────────────────────────────

  it("accepts min_grade_in_subject and rounds the grade to 1 decimal", () => {
    expect(
      validateCriteria({
        type: "min_grade_in_subject",
        subjectCode: " CC1AED1 ",
        minGrade: 7.25,
      }),
    ).toEqual({
      type: "min_grade_in_subject",
      subjectCode: "CC1AED1",
      minGrade: 7.3,
    });
  });

  it("accepts min_gpa and rounds to 1 decimal", () => {
    expect(validateCriteria({ type: "min_gpa", minGpa: 6.75 })).toEqual({
      type: "min_gpa",
      minGpa: 6.8,
    });
  });

  it("accepts approved_full_period", () => {
    expect(
      validateCriteria({ type: "approved_full_period", period: 3 }),
    ).toEqual({ type: "approved_full_period", period: 3 });
  });

  it("accepts workload_pct", () => {
    expect(validateCriteria({ type: "workload_pct", minPct: 50 })).toEqual({
      type: "workload_pct",
      minPct: 50,
    });
  });

  it("dedupes and trims subject codes", () => {
    const criteria = validateCriteria({
      type: "subjects_approved",
      subjectCodes: [" CC1A ", "CC1A", "CC1B"],
      min: 1,
    });
    expect(criteria).toEqual({
      type: "subjects_approved",
      subjectCodes: ["CC1A", "CC1B"],
      min: 1,
    });
  });

  it("rejects unknown types, bad min and empty codes", () => {
    expect(() => validateCriteria({ type: "nope", min: 1 })).toThrow(
      CriteriaError,
    );
    expect(() =>
      validateCriteria({ type: "subjects_approved_count", min: 0 }),
    ).toThrow(CriteriaError);
    expect(() =>
      validateCriteria({ type: "subjects_approved_count", min: 1.5 }),
    ).toThrow(CriteriaError);
    expect(() =>
      validateCriteria({ type: "subjects_approved", subjectCodes: [], min: 1 }),
    ).toThrow(CriteriaError);
    expect(() => validateCriteria(null)).toThrow(CriteriaError);
    expect(() => validateCriteria("x")).toThrow(CriteriaError);
    // Fase 6.2 — rejeições dos novos tipos:
    expect(() =>
      validateCriteria({
        type: "min_grade_in_subject",
        subjectCode: "",
        minGrade: 7,
      }),
    ).toThrow(CriteriaError);
    expect(() =>
      validateCriteria({
        type: "min_grade_in_subject",
        subjectCode: "CC1A",
        minGrade: 11,
      }),
    ).toThrow(CriteriaError);
    expect(() => validateCriteria({ type: "min_gpa", minGpa: -1 })).toThrow(
      CriteriaError,
    );
    expect(() =>
      validateCriteria({ type: "approved_full_period", period: 0 }),
    ).toThrow(CriteriaError);
    expect(() => validateCriteria({ type: "workload_pct", minPct: 0 })).toThrow(
      CriteriaError,
    );
    expect(() =>
      validateCriteria({ type: "workload_pct", minPct: 101 }),
    ).toThrow(CriteriaError);
  });

  it("rejects min greater than the number of selected subjects", () => {
    expect(() =>
      validateCriteria({
        type: "subjects_approved",
        subjectCodes: ["CC1A"],
        min: 2,
      }),
    ).toThrow(CriteriaError);
  });

  it("accepts every criteria shape used by the Fase 3 seed", () => {
    // Same shapes as prisma/data/gamification-base.json.
    expect(() =>
      validateCriteria({
        type: "subjects_approved",
        subjectCodes: ["CC31CP", "CC32LP"],
        min: 1,
      }),
    ).not.toThrow();
    expect(() =>
      validateCriteria({ type: "subjects_approved_count", min: 5 }),
    ).not.toThrow();
  });
});

describe("parseCriteriaInput", () => {
  it("maps empty input to null (manual achievement)", () => {
    expect(parseCriteriaInput("")).toBeNull();
    expect(parseCriteriaInput("   ")).toBeNull();
  });

  it("parses JSON and validates it", () => {
    expect(
      parseCriteriaInput('{"type":"subjects_approved_count","min":3}'),
    ).toEqual({ type: "subjects_approved_count", min: 3 });
    expect(() => parseCriteriaInput("{invalid")).toThrow(CriteriaError);
  });
});

describe("describeCriteria", () => {
  it("describes every branch in pt-BR", () => {
    expect(describeCriteria(null)).toMatch(/manual/i);
    expect(
      describeCriteria({
        type: "subjects_approved",
        subjectCodes: ["CC1A"],
        min: 1,
      }),
    ).toBe("Aprovar a disciplina CC1A");
    expect(
      describeCriteria({
        type: "subjects_approved",
        subjectCodes: ["CC1A", "CC1B"],
        min: 2,
      }),
    ).toBe("Aprovar as 2 disciplinas selecionadas");
    expect(
      describeCriteria({
        type: "subjects_approved",
        subjectCodes: ["CC1A", "CC1B", "CC1C"],
        min: 2,
      }),
    ).toBe("Aprovar 2 de 3 disciplinas selecionadas");
    expect(describeCriteria({ type: "subjects_approved_count", min: 7 })).toBe(
      "Aprovar 7 disciplinas do curso",
    );
    // Fase 6.2 — descrições dos novos tipos:
    expect(
      describeCriteria({
        type: "min_grade_in_subject",
        subjectCode: "CC1AED1",
        minGrade: 9,
      }),
    ).toBe("Obter nota ≥ 9 em CC1AED1");
    expect(describeCriteria({ type: "min_gpa", minGpa: 7 })).toBe(
      "Manter CR ≥ 7",
    );
    expect(describeCriteria({ type: "approved_full_period", period: 1 })).toBe(
      "Aprovar todas as disciplinas do 1º período",
    );
    expect(describeCriteria({ type: "approved_full_period", period: 3 })).toBe(
      "Aprovar todas as disciplinas do 3º período",
    );
    expect(describeCriteria({ type: "workload_pct", minPct: 50 })).toBe(
      "Concluir 50% da carga horária obrigatória",
    );
  });
});
