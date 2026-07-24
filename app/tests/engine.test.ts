import { describe, expect, it } from "vitest";
import type { Criteria } from "@/lib/criteria";
import {
  type AcademicFacts,
  evaluateCriteria,
  resolveLevel,
  resolveNodeStates,
} from "@/lib/engine";

function facts(...approved: string[]): AcademicFacts {
  return emptyFacts({ approvedSubjectCodes: new Set(approved) });
}

/// Builds AcademicFacts with safe defaults for the optional fields, so each
/// test only spells out what matters for the criterion under test.
function emptyFacts(overrides: Partial<AcademicFacts> = {}): AcademicFacts {
  return {
    approvedSubjectCodes: new Set(),
    bestGradeBySubject: new Map(),
    gpa: null,
    currentPeriod: null,
    workloadPct: 0,
    fullyApprovedPeriods: new Set(),
    ...overrides,
  };
}

describe("evaluateCriteria", () => {
  it("manual (null) nunca desbloqueia", () => {
    expect(evaluateCriteria(null, facts("A", "B"))).toEqual({
      met: false,
      progress: 0,
    });
  });

  it("subjects_approved: 1 de 2 aprovadas com min 2 → 50%", () => {
    const result = evaluateCriteria(
      { type: "subjects_approved", subjectCodes: ["MA1LM", "MA1FM"], min: 2 },
      facts("MA1LM"),
    );
    expect(result).toEqual({ met: false, progress: 50 });
  });

  it("subjects_approved: min menor que o conjunto (2 de 3)", () => {
    const criteria: Criteria = {
      type: "subjects_approved",
      subjectCodes: ["A", "B", "C"],
      min: 2,
    };
    expect(evaluateCriteria(criteria, facts("A"))).toEqual({
      met: false,
      progress: 50,
    });
    expect(evaluateCriteria(criteria, facts("A", "C"))).toEqual({
      met: true,
      progress: 100,
    });
    // Aprovar as 3 não passa de 100.
    expect(evaluateCriteria(criteria, facts("A", "B", "C")).progress).toBe(100);
  });

  it("subjects_approved_count conta qualquer disciplina", () => {
    const criteria: Criteria = { type: "subjects_approved_count", min: 4 };
    expect(evaluateCriteria(criteria, facts("A", "B", "C"))).toEqual({
      met: false,
      progress: 75,
    });
    expect(evaluateCriteria(criteria, facts("A", "B", "C", "D", "E")).met).toBe(
      true,
    );
  });

  // ── Fase 6.2: novos tipos ────────────────────────────────────────────

  it("min_grade_in_subject: nota parcial, atingida e saturação", () => {
    const criteria: Criteria = {
      type: "min_grade_in_subject",
      subjectCode: "CC1AED1",
      minGrade: 8,
    };
    // Sem nota na disciplina → 0.
    expect(
      evaluateCriteria(criteria, emptyFacts({ bestGradeBySubject: new Map() })),
    ).toEqual({ met: false, progress: 0 });
    // Nota 6 (abaixo de 8) → 75%.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ bestGradeBySubject: new Map([["CC1AED1", 6]]) }),
      ),
    ).toEqual({ met: false, progress: 75 });
    // Nota 8 → atingida.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ bestGradeBySubject: new Map([["CC1AED1", 8]]) }),
      ),
    ).toEqual({ met: true, progress: 100 });
    // Nota 10 não passa de 100.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ bestGradeBySubject: new Map([["CC1AED1", 10]]) }),
      ).progress,
    ).toBe(100);
  });

  it("min_grade_in_subject usa a melhor nota entre tentativas", () => {
    const criteria: Criteria = {
      type: "min_grade_in_subject",
      subjectCode: "X",
      minGrade: 7,
    };
    // Reprovou com 4, depois aprovou com 8 → a melhor (8) conta.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ bestGradeBySubject: new Map([["X", 8]]) }),
      ),
    ).toEqual({ met: true, progress: 100 });
  });

  it("min_gpa: sem CR (null) não desbloqueia; parcial; atingido", () => {
    const criteria: Criteria = { type: "min_gpa", minGpa: 7 };
    // Calouro sem CR ainda → 0.
    expect(evaluateCriteria(criteria, emptyFacts({ gpa: null }))).toEqual({
      met: false,
      progress: 0,
    });
    // CR 5 → ~71%.
    expect(evaluateCriteria(criteria, emptyFacts({ gpa: 5 }))).toEqual({
      met: false,
      progress: 71,
    });
    // CR 7 → atingido.
    expect(evaluateCriteria(criteria, emptyFacts({ gpa: 7 }))).toEqual({
      met: true,
      progress: 100,
    });
  });

  it("approved_full_period: só atinge com o período completo", () => {
    const criteria: Criteria = { type: "approved_full_period", period: 1 };
    // Período 1 não concluído.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ fullyApprovedPeriods: new Set() }),
      ),
    ).toEqual({ met: false, progress: 0 });
    // Período 1 completo.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ fullyApprovedPeriods: new Set([1]) }),
      ),
    ).toEqual({ met: true, progress: 100 });
    // Concluiu o período 2 mas não o 1 → não atinge o critério do 1.
    expect(
      evaluateCriteria(
        criteria,
        emptyFacts({ fullyApprovedPeriods: new Set([2]) }),
      ),
    ).toEqual({ met: false, progress: 0 });
  });

  it("workload_pct: parcial, atingido e saturação", () => {
    const criteria: Criteria = { type: "workload_pct", minPct: 50 };
    expect(evaluateCriteria(criteria, emptyFacts({ workloadPct: 25 }))).toEqual(
      { met: false, progress: 50 },
    );
    expect(evaluateCriteria(criteria, emptyFacts({ workloadPct: 50 }))).toEqual(
      { met: true, progress: 100 },
    );
    // 100% não passa de 100.
    expect(
      evaluateCriteria(criteria, emptyFacts({ workloadPct: 100 })).progress,
    ).toBe(100);
  });
});

describe("resolveNodeStates", () => {
  const nodes = [
    { id: "fund", parentId: null, requiredSubjectCodes: ["A", "B"] },
    { id: "prog", parentId: "fund", requiredSubjectCodes: ["C", "D"] },
    { id: "ia", parentId: "prog", requiredSubjectCodes: ["E"] },
  ];

  it("raiz sem aprovações fica in-progress; filhos locked", () => {
    const states = resolveNodeStates(nodes, facts());
    expect(states.get("fund")).toEqual({ state: "in-progress", progress: 0 });
    expect(states.get("prog")?.state).toBe("locked");
    expect(states.get("ia")?.state).toBe("locked");
  });

  it("cadeia: raiz done → filho in-progress com % parcial", () => {
    const states = resolveNodeStates(nodes, facts("A", "B", "C"));
    expect(states.get("fund")).toEqual({ state: "done", progress: 100 });
    expect(states.get("prog")).toEqual({ state: "in-progress", progress: 50 });
    expect(states.get("ia")?.state).toBe("locked");
  });

  it("requisitos completos com pai bloqueado NÃO marcam done", () => {
    // E aprovado, mas prog (pai) não concluído → ia continua locked.
    const states = resolveNodeStates(nodes, facts("A", "B", "E"));
    expect(states.get("ia")?.state).toBe("locked");
    expect(states.get("ia")?.progress).toBe(100);
  });

  it("independe da ordem de entrada (filhos antes dos pais)", () => {
    const reversed = [...nodes].reverse();
    const states = resolveNodeStates(reversed, facts("A", "B", "C", "D"));
    expect(states.get("prog")?.state).toBe("done");
    expect(states.get("ia")?.state).toBe("in-progress");
  });

  it("nó sem requisitos herda estado do alcance (root = done)", () => {
    const states = resolveNodeStates(
      [{ id: "solo", parentId: null, requiredSubjectCodes: [] }],
      facts(),
    );
    expect(states.get("solo")).toEqual({ state: "done", progress: 100 });
  });
});

describe("resolveLevel", () => {
  // Tabela do seed: minXp = 50·i·(i+1) → L1=0, L2=100, L3=300, L4=600…
  const levels = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    minXp: 50 * i * (i + 1),
    title: `T${i + 1}`,
  }));

  it("caso conferido à mão: 250 XP → nível 2 (100 ≤ 250 < 300)", () => {
    expect(resolveLevel(levels, 250)).toEqual({
      level: 2,
      title: "T2",
      minXp: 100,
      nextMinXp: 300,
    });
  });

  it("limiar exato sobe de nível (600 XP → nível 4)", () => {
    expect(resolveLevel(levels, 600).level).toBe(4);
  });

  it("0 XP → nível 1; acima do topo → nível máximo sem next", () => {
    expect(resolveLevel(levels, 0).level).toBe(1);
    const max = resolveLevel(levels, 99999);
    expect(max.level).toBe(10);
    expect(max.nextMinXp).toBeNull();
  });

  it("sem níveis configurados → nível 1 virtual", () => {
    expect(resolveLevel([], 500)).toEqual({
      level: 1,
      title: "Nível 1",
      minXp: 0,
      nextMinXp: null,
    });
  });
});
