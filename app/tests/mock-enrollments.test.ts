import { describe, expect, it } from "vitest";
import {
  advanceTerm,
  type MockEnrollmentPlanInput,
  planMockEnrollments,
} from "@/lib/mock-enrollments";

const entries = [
  { code: "S1A", period: 1, isElective: false },
  { code: "S1B", period: 1, isElective: false },
  { code: "S2A", period: 2, isElective: false },
  { code: "S3A", period: 3, isElective: false },
  { code: "OPT1", period: 3, isElective: true },
  { code: "OPT2", period: 4, isElective: true },
  { code: "OPT3", period: 4, isElective: true },
];

function active(currentPeriod: number): MockEnrollmentPlanInput {
  return {
    ra: "a1234567",
    admissionTerm: "2023/1",
    currentPeriod,
    graduated: false,
    entries,
  };
}

describe("advanceTerm", () => {
  it("avança semestres com virada de ano", () => {
    expect(advanceTerm("2023/1", 0)).toBe("2023/1");
    expect(advanceTerm("2023/1", 1)).toBe("2023/2");
    expect(advanceTerm("2023/2", 1)).toBe("2024/1");
    expect(advanceTerm("2023/1", 4)).toBe("2025/1");
  });
});

describe("planMockEnrollments", () => {
  it("é determinístico (reseed não embaralha histórico)", () => {
    expect(planMockEnrollments(active(3))).toEqual(
      planMockEnrollments(active(3)),
    );
  });

  it("períodos passados aprovados, atual em curso, futuros ausentes", () => {
    const plan = planMockEnrollments(active(2));
    const byCode = new Map(plan.map((p) => [p.subjectCode, p]));
    expect(byCode.get("S1A")?.status).toBe("APPROVED");
    expect(byCode.get("S2A")?.status).toBe("IN_PROGRESS");
    expect(byCode.get("S2A")?.grade).toBeNull();
    expect(byCode.has("S3A")).toBe(false);
    expect(byCode.has("OPT1")).toBe(false);
  });

  it("aprovado tem nota 6.0–10.0 e frequência 75–100", () => {
    const plan = planMockEnrollments(active(4));
    for (const p of plan.filter((p) => p.status === "APPROVED")) {
      expect(p.grade).toBeGreaterThanOrEqual(6);
      expect(p.grade).toBeLessThanOrEqual(10);
      expect(p.attendance).toBeGreaterThanOrEqual(75);
      expect(p.attendance).toBeLessThanOrEqual(100);
    }
  });

  it("reprovação vem com reaprovação no semestre seguinte", () => {
    // Varre RAs até achar um caso de FAILED (hash %9) e valida o par.
    for (let i = 0; i < 30; i++) {
      const plan = planMockEnrollments({
        ...active(4),
        ra: `a00000${i.toString().padStart(2, "0")}`,
      });
      const failed = plan.filter((p) => p.status === "FAILED");
      for (const f of failed) {
        const retake = plan.find(
          (p) => p.subjectCode === f.subjectCode && p.status === "APPROVED",
        );
        expect(retake).toBeDefined();
        expect(retake?.term).toBe(advanceTerm(f.term, 1));
      }
      if (failed.length > 0) return;
    }
    throw new Error("nenhum caso de reprovação encontrado na amostra");
  });

  it("formado aprova todas as obrigatórias + 2 eletivas", () => {
    const plan = planMockEnrollments({
      ra: "a2190001",
      admissionTerm: "2019/1",
      currentPeriod: null,
      graduated: true,
      entries,
    });
    const approved = plan.filter((p) => p.status === "APPROVED");
    const codes = new Set(approved.map((p) => p.subjectCode));
    expect(codes.has("S1A")).toBe(true);
    expect(codes.has("S3A")).toBe(true);
    expect([...codes].filter((c) => c.startsWith("OPT"))).toHaveLength(2);
    expect(plan.some((p) => p.status === "IN_PROGRESS")).toBe(false);
  });
});
