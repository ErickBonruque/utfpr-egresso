// Gamification engine (Fase 6). Pure: receives academic facts (from the
// UTFPR mirror) + course config (from the admin) and derives achievement
// progress, track node states, XP and level. No I/O — the server layer
// (src/server/student-progress.ts) loads data and persists results.

import type { Criteria } from "@/lib/criteria";

/// What the engine knows about a student's academic life.
export type AcademicFacts = {
  /// Codes of subjects with an APPROVED enrollment.
  approvedSubjectCodes: ReadonlySet<string>;
  /// Best grade (0–10) achieved per subject code (highest over attempts).
  bestGradeBySubject: ReadonlyMap<string, number>;
  /// Coeficiente de rendimento on the 0–10 scale (null when not yet computed).
  gpa: number | null;
  /// Current period of the student (1-based), null when unknown.
  currentPeriod: number | null;
  /// Percentage (0–100) of the mandatory workload approved.
  workloadPct: number;
  /// Period numbers (1-based) the student has fully approved (every mandatory
  /// subject of that period has an APPROVED enrollment).
  fullyApprovedPeriods: ReadonlySet<number>;
};

export type CriteriaEvaluation = {
  met: boolean;
  /// 0–100, monotonic toward unlock; manual criteria stay at 0.
  progress: number;
};

/// Evaluates one achievement criteria against the facts. criteria = null
/// means a manual achievement — never unlocked automatically.
export function evaluateCriteria(
  criteria: Criteria | null,
  facts: AcademicFacts,
): CriteriaEvaluation {
  if (!criteria) return { met: false, progress: 0 };

  switch (criteria.type) {
    case "subjects_approved": {
      const done = criteria.subjectCodes.filter((code) =>
        facts.approvedSubjectCodes.has(code),
      ).length;
      return {
        met: done >= criteria.min,
        progress: Math.min(100, Math.round((done / criteria.min) * 100)),
      };
    }
    case "subjects_approved_count": {
      const done = facts.approvedSubjectCodes.size;
      return {
        met: done >= criteria.min,
        progress: Math.min(100, Math.round((done / criteria.min) * 100)),
      };
    }
    case "min_grade_in_subject": {
      const grade = facts.bestGradeBySubject.get(criteria.subjectCode);
      if (grade === undefined) {
        return { met: false, progress: 0 };
      }
      return {
        met: grade >= criteria.minGrade,
        progress: Math.min(100, Math.round((grade / criteria.minGrade) * 100)),
      };
    }
    case "min_gpa": {
      // No CR yet (freshman, not synced) → cannot meet, no partial progress.
      if (facts.gpa === null) return { met: false, progress: 0 };
      return {
        met: facts.gpa >= criteria.minGpa,
        progress: Math.min(
          100,
          Math.round((facts.gpa / criteria.minGpa) * 100),
        ),
      };
    }
    case "approved_full_period": {
      const met = facts.fullyApprovedPeriods.has(criteria.period);
      return { met, progress: met ? 100 : 0 };
    }
    case "workload_pct": {
      const pct = facts.workloadPct;
      return {
        met: pct >= criteria.minPct,
        progress: Math.min(100, Math.round((pct / criteria.minPct) * 100)),
      };
    }
  }
}

export type EngineTrackNode = {
  id: string;
  parentId: string | null;
  /// Codes of the subjects required to complete the node.
  requiredSubjectCodes: string[];
};

export type NodeState = "done" | "in-progress" | "locked";

export type NodeEvaluation = {
  state: NodeState;
  /// % of required subjects approved (100 when there are no requirements).
  progress: number;
};

/// Resolves the visual state of every track node:
/// - done: all required subjects approved;
/// - in-progress: not done, but reachable (root or parent done);
/// - locked: parent not done yet.
/// Nodes are processed parents-first regardless of input order.
export function resolveNodeStates(
  nodes: EngineTrackNode[],
  facts: AcademicFacts,
): Map<string, NodeEvaluation> {
  const result = new Map<string, NodeEvaluation>();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  function evaluate(node: EngineTrackNode): NodeEvaluation {
    const cached = result.get(node.id);
    if (cached) return cached;

    const total = node.requiredSubjectCodes.length;
    const done = node.requiredSubjectCodes.filter((code) =>
      facts.approvedSubjectCodes.has(code),
    ).length;
    const progress = total === 0 ? 100 : Math.round((done / total) * 100);

    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    // Orphan parentId (admin mid-edit) counts as root — same tolerance as
    // layoutCareerTree.
    const parentDone = parent ? evaluate(parent).state === "done" : true;

    const state: NodeState =
      progress === 100 && parentDone
        ? "done"
        : parentDone
          ? "in-progress"
          : "locked";

    const evaluation = { state, progress };
    result.set(node.id, evaluation);
    return evaluation;
  }

  for (const node of nodes) evaluate(node);
  return result;
}

export type LevelResolution = {
  level: number;
  title: string;
  /// XP threshold of the current level.
  minXp: number;
  /// XP threshold of the next level; null at max level.
  nextMinXp: number | null;
};

/// Highest configured level whose minXp <= totalXp (LevelDefinition rule).
/// Falls back to a virtual level 1 when the course has no levels configured.
export function resolveLevel(
  levels: { level: number; minXp: number; title: string }[],
  totalXp: number,
): LevelResolution {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  let current = sorted[0] ?? { level: 1, minXp: 0, title: "Nível 1" };
  let next: (typeof sorted)[number] | undefined;

  for (const candidate of sorted) {
    if (candidate.minXp <= totalXp) {
      current = candidate;
    } else {
      next = candidate;
      break;
    }
  }

  return {
    level: current.level,
    title: current.title,
    minXp: current.minXp,
    nextMinXp: next?.minXp ?? null,
  };
}
