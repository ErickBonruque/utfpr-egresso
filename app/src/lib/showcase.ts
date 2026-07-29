/// Projeção pública da vitrine de egressos (Fase 7). A allow-list do que é
/// publicável vive aqui, e a página só consome — assim "o que a vitrine expõe"
/// vira uma decisão testável, e um campo novo no GraduateProfile não escapa
/// para a vitrine só porque alguém ampliou o `select` da query.
///
/// Regra de privacidade (revisão da Fase 7): nada do `User` além do nome
/// (o e-mail de login nunca sai — o contato é o `contactEmail`, opt-in), nada
/// do histórico acadêmico (RA, notas, CR, período) e nada de quem não ligou
/// `showInShowcase`.

/// Forma lida do banco. Aceita linhas mais ricas que isto (tipagem
/// estrutural): a projeção descarta o que não estiver na allow-list.
export type ShowcaseSource = {
  showInShowcase: boolean;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  contactEmail: string | null;
  mentorshipAvailable: boolean;
  mentorshipAreas: string[];
  graduatedTerm: string | null;
  studentProfile: {
    bio: string | null;
    user: { name: string };
    course: { name: string; campus: { name: string } };
  };
};

/// O que a vitrine publica de cada egresso. Mesma forma consumida pelo
/// `GraduateCard`.
export type ShowcaseEntry = {
  name: string;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  contactEmail: string | null;
  mentorshipAvailable: boolean;
  mentorshipAreas: string[];
  graduatedTerm: string | null;
  courseName: string;
  campusName: string;
};

/// Allow-list explícita, em forma de dado, para o teste conseguir afirmar que
/// a projeção não emite nada além disto.
export const SHOWCASE_PUBLIC_FIELDS = [
  "name",
  "bio",
  "jobTitle",
  "company",
  "linkedinUrl",
  "githubUrl",
  "contactEmail",
  "mentorshipAvailable",
  "mentorshipAreas",
  "graduatedTerm",
  "courseName",
  "campusName",
] as const satisfies readonly (keyof ShowcaseEntry)[];

/// Opt-in do egresso: sem `showInShowcase` o perfil não aparece. Duplica de
/// propósito o `where` da query — defesa em profundidade para o dia em que
/// alguém reusar a projeção numa consulta sem filtro.
export function isVisibleInShowcase(profile: {
  showInShowcase: boolean;
}): boolean {
  return profile.showInShowcase === true;
}

/// Achata a linha do banco na entrada pública. Campo por campo de propósito
/// (nada de spread): a lista abaixo É a política de privacidade.
export function toShowcaseEntry(row: ShowcaseSource): ShowcaseEntry {
  return {
    name: row.studentProfile.user.name,
    bio: row.studentProfile.bio,
    jobTitle: row.jobTitle,
    company: row.company,
    linkedinUrl: row.linkedinUrl,
    githubUrl: row.githubUrl,
    contactEmail: row.contactEmail,
    mentorshipAvailable: row.mentorshipAvailable,
    // Áreas descrevem a mentoria: com o toggle desligado elas nem chegam ao
    // cliente (o card já não as mostrava, mas o payload as carregava).
    mentorshipAreas: row.mentorshipAvailable ? row.mentorshipAreas : [],
    graduatedTerm: row.graduatedTerm,
    courseName: row.studentProfile.course.name,
    campusName: row.studentProfile.course.campus.name,
  };
}

/// Porta única da vitrine: filtra o opt-in e projeta.
export function toShowcase(rows: ShowcaseSource[]): ShowcaseEntry[] {
  return rows.filter(isVisibleInShowcase).map(toShowcaseEntry);
}
