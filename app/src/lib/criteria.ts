// Achievement unlock criteria — the contract shared with the gamification
// engine (Fase 6) and the admin criteria builder (Fase 4). Pure: validation
// and human-readable descriptions only, no I/O.
//
// Stored in Achievement.criteria (Json?). null = manual achievement (never
// unlocked automatically by the engine).
//
// Fase 6.2 (2026-07-24) added grade/GPA/period/workload criteria. The engine
// consumes the same contract; new types only extend the union — no refactor.

export type Criteria =
  | { type: "subjects_approved"; subjectCodes: string[]; min: number }
  | { type: "subjects_approved_count"; min: number }
  // Fase 6.2 — richer mechanics:
  | { type: "min_grade_in_subject"; subjectCode: string; minGrade: number }
  | { type: "min_gpa"; minGpa: number }
  | { type: "approved_full_period"; period: number }
  | { type: "workload_pct"; minPct: number };

export type CriteriaType = Criteria["type"];

/// Registry the builder UI renders from. New criteria types are added here +
/// in validateCriteria + describeCriteria + a branch in evaluateCriteria.
export const CRITERIA_TYPES: {
  type: CriteriaType;
  label: string;
  help: string;
}[] = [
  {
    type: "subjects_approved",
    label: "Disciplinas específicas aprovadas",
    help: "Desbloqueia ao aprovar N disciplinas dentre as selecionadas.",
  },
  {
    type: "subjects_approved_count",
    label: "Total de disciplinas aprovadas",
    help: "Desbloqueia ao aprovar N disciplinas quaisquer do curso.",
  },
  {
    type: "min_grade_in_subject",
    label: "Nota mínima em disciplina",
    help: "Desbloqueia ao obter nota ≥ X em uma disciplina específica.",
  },
  {
    type: "min_gpa",
    label: "CR (coeficiente de rendimento) mínimo",
    help: "Desbloqueia ao manter o CR ≥ X (escala 0–10).",
  },
  {
    type: "approved_full_period",
    label: "Período letivo completo",
    help: "Desbloqueia ao aprovar todas as disciplinas de um período (1º, 2º...).",
  },
  {
    type: "workload_pct",
    label: "Carga horária concluída",
    help: "Desbloqueia ao concluir X% da carga horária obrigatória.",
  },
];

export class CriteriaError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/// Rounds to 1 decimal place (grades/GPA are entered with one decimal).
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/// Validates an unknown value (form input, seed JSON, DB row) into a
/// well-formed Criteria. Throws CriteriaError with a pt-BR message.
export function validateCriteria(value: unknown): Criteria {
  if (!isRecord(value)) {
    throw new CriteriaError("Critério deve ser um objeto JSON.");
  }

  switch (value.type) {
    case "subjects_approved": {
      const min = value.min;
      if (typeof min !== "number" || !Number.isInteger(min) || min < 1) {
        throw new CriteriaError(
          "Critério precisa de um mínimo (min) inteiro maior ou igual a 1.",
        );
      }
      const codes = value.subjectCodes;
      if (
        !Array.isArray(codes) ||
        codes.length === 0 ||
        !codes.every((c) => typeof c === "string" && c.trim() !== "")
      ) {
        throw new CriteriaError(
          "Selecione ao menos uma disciplina para o critério.",
        );
      }
      const unique = [...new Set(codes.map((c: string) => c.trim()))];
      if (min > unique.length) {
        throw new CriteriaError(
          "O mínimo não pode ser maior que o número de disciplinas selecionadas.",
        );
      }
      return { type: "subjects_approved", subjectCodes: unique, min };
    }
    case "subjects_approved_count": {
      const min = value.min;
      if (typeof min !== "number" || !Number.isInteger(min) || min < 1) {
        throw new CriteriaError(
          "Informe um mínimo de disciplinas inteiro e maior ou igual a 1.",
        );
      }
      return { type: "subjects_approved_count", min };
    }
    case "min_grade_in_subject": {
      const subjectCode = value.subjectCode;
      if (typeof subjectCode !== "string" || subjectCode.trim() === "") {
        throw new CriteriaError("Selecione a disciplina do critério de nota.");
      }
      const minGrade = value.minGrade;
      if (
        typeof minGrade !== "number" ||
        Number.isNaN(minGrade) ||
        minGrade < 0 ||
        minGrade > 10
      ) {
        throw new CriteriaError("A nota mínima deve estar entre 0 e 10.");
      }
      return {
        type: "min_grade_in_subject",
        subjectCode: subjectCode.trim(),
        minGrade: round1(minGrade),
      };
    }
    case "min_gpa": {
      const minGpa = value.minGpa;
      if (
        typeof minGpa !== "number" ||
        Number.isNaN(minGpa) ||
        minGpa < 0 ||
        minGpa > 10
      ) {
        throw new CriteriaError("O CR mínimo deve estar entre 0 e 10.");
      }
      return { type: "min_gpa", minGpa: round1(minGpa) };
    }
    case "approved_full_period": {
      const period = value.period;
      if (
        typeof period !== "number" ||
        !Number.isInteger(period) ||
        period < 1
      ) {
        throw new CriteriaError(
          "Informe um período inteiro maior ou igual a 1.",
        );
      }
      return { type: "approved_full_period", period };
    }
    case "workload_pct": {
      const minPct = value.minPct;
      if (
        typeof minPct !== "number" ||
        !Number.isInteger(minPct) ||
        minPct < 1 ||
        minPct > 100
      ) {
        throw new CriteriaError(
          "A porcentagem de carga horária deve ser um inteiro entre 1 e 100.",
        );
      }
      return { type: "workload_pct", minPct };
    }
    default:
      throw new CriteriaError("Tipo de critério desconhecido.");
  }
}

/// Parses the hidden input the criteria builder submits: empty string means
/// a manual achievement (criteria = null).
export function parseCriteriaInput(raw: string): Criteria | null {
  if (raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CriteriaError("Critério em formato JSON inválido.");
  }
  return validateCriteria(parsed);
}

/// pt-BR summary shown in the achievements list and the builder preview.
export function describeCriteria(criteria: Criteria | null): string {
  if (!criteria) return "Concessão manual (sem critério automático)";
  switch (criteria.type) {
    case "subjects_approved": {
      const total = criteria.subjectCodes.length;
      if (criteria.min === total) {
        return total === 1
          ? `Aprovar a disciplina ${criteria.subjectCodes[0]}`
          : `Aprovar as ${total} disciplinas selecionadas`;
      }
      return `Aprovar ${criteria.min} de ${total} disciplinas selecionadas`;
    }
    case "subjects_approved_count":
      return criteria.min === 1
        ? "Aprovar 1 disciplina do curso"
        : `Aprovar ${criteria.min} disciplinas do curso`;
    case "min_grade_in_subject":
      return `Obter nota ≥ ${criteria.minGrade.toLocaleString("pt-BR")} em ${criteria.subjectCode}`;
    case "min_gpa":
      return `Manter CR ≥ ${criteria.minGpa.toLocaleString("pt-BR")}`;
    case "approved_full_period": {
      const suffix =
        criteria.period === 1
          ? "1º"
          : criteria.period === 2
            ? "2º"
            : `${criteria.period}º`;
      return `Aprovar todas as disciplinas do ${suffix} período`;
    }
    case "workload_pct":
      return `Concluir ${criteria.minPct}% da carga horária obrigatória`;
  }
}
