// Achievement unlock criteria — the contract shared with the gamification
// engine (Fase 6) and the admin criteria builder (Fase 4). Pure: validation
// and human-readable descriptions only, no I/O.
//
// Stored in Achievement.criteria (Json?). null = manual achievement (never
// unlocked automatically by the engine).

export type Criteria =
  | { type: "subjects_approved"; subjectCodes: string[]; min: number }
  | { type: "subjects_approved_count"; min: number };

export type CriteriaType = Criteria["type"];

/// Registry the builder UI renders from. New criteria types (Fase 6 will
/// likely add period/GPA based ones) are added here + in validateCriteria.
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
];

export class CriteriaError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/// Validates an unknown value (form input, seed JSON, DB row) into a
/// well-formed Criteria. Throws CriteriaError with a pt-BR message.
export function validateCriteria(value: unknown): Criteria {
  if (!isRecord(value)) {
    throw new CriteriaError("Critério deve ser um objeto JSON.");
  }
  const min = value.min;
  if (typeof min !== "number" || !Number.isInteger(min) || min < 1) {
    throw new CriteriaError(
      "Critério precisa de um mínimo (min) inteiro maior ou igual a 1.",
    );
  }

  switch (value.type) {
    case "subjects_approved": {
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
    case "subjects_approved_count":
      return { type: "subjects_approved_count", min };
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
  }
}
