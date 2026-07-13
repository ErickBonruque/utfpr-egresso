// Deterministic mock enrollment planner (Fase 6). Generates the UTFPR-mirror
// rows (Enrollment) for the seeded students until the real integration lands
// (Fase 8, AcademicDataProvider). Pure: no I/O, stable output for a given
// input — reseeding never shuffles anyone's academic history.

export type MockEnrollmentPlanInput = {
  ra: string;
  /// e.g. "2023/1"
  admissionTerm: string;
  /// 1-based current period for active students; null for graduates.
  currentPeriod: number | null;
  graduated: boolean;
  entries: {
    code: string;
    period: number;
    isElective: boolean;
  }[];
};

export type PlannedEnrollment = {
  subjectCode: string;
  term: string;
  status: "APPROVED" | "IN_PROGRESS" | "FAILED";
  /// 0.0–10.0, null while in progress
  grade: number | null;
  /// 0–100, null while in progress
  attendance: number | null;
};

/// FNV-1a 32-bit — stable tiny hash for deterministic pseudo-randomness.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/// "2023/1" + n semesters → academic term label.
export function advanceTerm(term: string, semesters: number): string {
  const match = /^(\d{4})\/([12])$/.exec(term);
  if (!match) throw new Error(`Período letivo inválido: ${term}`);
  const total = Number(match[1]) * 2 + (Number(match[2]) - 1) + semesters;
  return `${Math.floor(total / 2)}/${(total % 2) + 1}`;
}

function gradeFor(ra: string, code: string): number {
  // 6.0–10.0, one decimal — approved subjects only.
  return Math.round(60 + (hash(`${ra}:${code}:grade`) % 41)) / 10;
}

function attendanceFor(ra: string, code: string): number {
  return 75 + (hash(`${ra}:${code}:att`) % 26);
}

/// Plans the full mock academic history of one student:
/// - mandatory subjects of past periods → APPROVED (≈1 in 9 fails first and
///   retakes the next term, when there is room before the current period);
/// - mandatory subjects of the current period → IN_PROGRESS;
/// - graduates → everything mandatory APPROVED + the 2 first electives;
/// - electives are skipped for active students (realistic: chosen late).
export function planMockEnrollments(
  input: MockEnrollmentPlanInput,
): PlannedEnrollment[] {
  const plan: PlannedEnrollment[] = [];
  const lastDonePeriod = input.graduated
    ? Number.POSITIVE_INFINITY
    : (input.currentPeriod ?? 1) - 1;

  const electivesTaken = input.graduated
    ? input.entries
        .filter((e) => e.isElective)
        .sort((a, b) => a.code.localeCompare(b.code))
        .slice(0, 2)
        .map((e) => e.code)
    : [];

  for (const entry of input.entries) {
    const elective = entry.isElective;
    if (elective && !electivesTaken.includes(entry.code)) continue;

    const term = advanceTerm(input.admissionTerm, entry.period - 1);

    if (!input.graduated && entry.period === input.currentPeriod) {
      if (!elective) {
        plan.push({
          subjectCode: entry.code,
          term,
          status: "IN_PROGRESS",
          grade: null,
          attendance: null,
        });
      }
      continue;
    }
    if (entry.period > lastDonePeriod) continue;

    const failsFirst =
      !elective &&
      hash(`${input.ra}:${entry.code}:fail`) % 9 === 0 &&
      // Needs room to retake before the current period.
      (input.graduated || entry.period + 1 <= lastDonePeriod);

    if (failsFirst) {
      plan.push({
        subjectCode: entry.code,
        term,
        status: "FAILED",
        grade: Math.round(hash(`${input.ra}:${entry.code}:fgrade`) % 40) / 10,
        attendance: attendanceFor(input.ra, entry.code),
      });
      plan.push({
        subjectCode: entry.code,
        term: advanceTerm(term, 1),
        status: "APPROVED",
        grade: gradeFor(input.ra, entry.code),
        attendance: attendanceFor(input.ra, entry.code),
      });
    } else {
      plan.push({
        subjectCode: entry.code,
        term,
        status: "APPROVED",
        grade: gradeFor(input.ra, entry.code),
        attendance: attendanceFor(input.ra, entry.code),
      });
    }
  }

  return plan;
}
