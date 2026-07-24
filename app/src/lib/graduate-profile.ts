/// Pure validation for GraduateProfile edits (Fase 7). Extracted from the
/// server action so it can be unit-tested without DB/session mocking — same
/// pattern as src/lib/criteria.ts (validate/describe puros + action que
/// consome). The action in graduate-actions.ts calls this, then writes.

export type GraduateInput = {
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  githubUrl: string;
  contactEmail: string;
  /// Raw comma-separated string straight from the form; split here.
  mentorshipAreasRaw: string;
};

export type GraduateParsed = {
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  contactEmail: string | null;
  mentorshipAreas: string[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
export const MAX_AREAS = 5;
export const MAX_AREA_LEN = 80;
export const MAX_COMPANY_LEN = 120;
export const MAX_JOBTITLE_LEN = 120;

/// Validates + normalizes the raw form input. Returns `{ error }` (pt-BR) on
/// any failure, or `{ value }` with the parsed/trimmed fields ready for
/// Prisma. Empty strings become null; empty areas are dropped.
export function validateGraduateProfile(
  input: GraduateInput,
): { error: string } | { value: GraduateParsed } {
  const company = input.company.trim();
  const jobTitle = input.jobTitle.trim();
  const linkedinUrl = input.linkedinUrl.trim();
  const githubUrl = input.githubUrl.trim();
  const contactEmail = input.contactEmail.trim();

  if (company.length > MAX_COMPANY_LEN)
    return {
      error: `O nome da empresa é longo demais (máx. ${MAX_COMPANY_LEN}).`,
    };
  if (jobTitle.length > MAX_JOBTITLE_LEN)
    return { error: `O cargo é longo demais (máx. ${MAX_JOBTITLE_LEN}).` };
  if (contactEmail !== "" && !EMAIL_PATTERN.test(contactEmail)) {
    return { error: "O e-mail de contato não parece válido." };
  }
  for (const [label, url] of [
    ["LinkedIn", linkedinUrl],
    ["GitHub", githubUrl],
  ] as const) {
    if (url !== "" && !URL_PATTERN.test(url)) {
      return {
        error: `O link do ${label} precisa começar com http:// ou https://.`,
      };
    }
  }

  const mentorshipAreas = input.mentorshipAreasRaw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a !== "");
  if (mentorshipAreas.length > MAX_AREAS) {
    return { error: `Você pode informar no máximo ${MAX_AREAS} áreas.` };
  }
  for (const area of mentorshipAreas) {
    if (area.length > MAX_AREA_LEN) {
      return {
        error: `Cada área de mentoria tem no máximo ${MAX_AREA_LEN} caracteres.`,
      };
    }
  }

  return {
    value: {
      company: company === "" ? null : company,
      jobTitle: jobTitle === "" ? null : jobTitle,
      linkedinUrl: linkedinUrl === "" ? null : linkedinUrl,
      githubUrl: githubUrl === "" ? null : githubUrl,
      contactEmail: contactEmail === "" ? null : contactEmail,
      mentorshipAreas,
    },
  };
}
