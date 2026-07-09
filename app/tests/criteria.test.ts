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
  });
});
