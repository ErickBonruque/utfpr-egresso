// Revisão da Fase 7: "fluxo de transição aluno → egresso testado de ponta a
// ponta". O teste de academic-standing cobre a primeira metade (a regra que
// cria o GraduateProfile). Aqui a corrente inteira é percorrida, do dado
// espelhado até o card publicado na vitrine:
//
//   standing GRADUATED → GraduateProfile → Actor.isGraduate → papel EGRESSO
//   → permissão de editar o perfil → validação do formulário → vitrine.
//
// Sem banco e sem sessão: cada elo já é uma função pura ou recebe o cliente
// por parâmetro, então a composição também é testável.
import { describe, expect, it } from "vitest";
import {
  type Actor,
  canEditGraduateProfile,
  primaryRole,
} from "../src/lib/authz";
import { validateGraduateProfile } from "../src/lib/graduate-profile";
import { type ShowcaseSource, toShowcase } from "../src/lib/showcase";
import { applyAcademicStanding } from "../src/server/academic-standing";
import { fakeStandingDb } from "./helpers/standing-db";

const PROFILE_ID = "sp-1";
const COURSE = {
  name: "Engenharia de Software",
  campus: { name: "Sta Helena" },
};

/// Reproduz o que getActor() monta a partir do banco: `isGraduate` é a mera
/// existência do GraduateProfile, não uma coluna de papel.
function actorFor(graduateProfileExists: boolean): Actor {
  return {
    userId: "u1",
    grants: [],
    student: {
      profileId: PROFILE_ID,
      courseId: "course-eng",
      campusId: "campus-sh",
      isGraduate: graduateProfileExists,
    },
  };
}

describe("aluno → egresso, de ponta a ponta", () => {
  it("aluno em curso: sem perfil de egresso, sem permissão, fora da vitrine", async () => {
    const { db, graduates } = fakeStandingDb();

    await applyAcademicStanding(db, PROFILE_ID, {
      status: "ACTIVE",
      currentPeriod: 8,
    });

    expect(graduates.has(PROFILE_ID)).toBe(false);
    const actor = actorFor(graduates.has(PROFILE_ID));
    expect(primaryRole(actor)).toBe("ALUNO");
    expect(canEditGraduateProfile(actor)).toBe(false);
  });

  it("colação de grau: perfil criado, papel vira EGRESSO e o portal libera a edição", async () => {
    const { db, standings, graduates } = fakeStandingDb();

    await applyAcademicStanding(db, PROFILE_ID, { status: "ACTIVE" });
    // Mesma porta usada pela sincronização e pelo forceGraduation do admin.
    await applyAcademicStanding(db, PROFILE_ID, {
      status: "GRADUATED",
      graduatedTerm: "2025/2",
    });

    expect(standings.get(PROFILE_ID)).toMatchObject({ status: "GRADUATED" });
    expect(graduates.get(PROFILE_ID)).toMatchObject({
      studentProfileId: PROFILE_ID,
      graduatedTerm: "2025/2",
    });

    const actor = actorFor(graduates.has(PROFILE_ID));
    expect(primaryRole(actor)).toBe("EGRESSO");
    expect(canEditGraduateProfile(actor)).toBe(true);
  });

  it("egresso preenche o perfil e escolhe aparecer: o card publicado bate com o que ele digitou", async () => {
    const { db, graduates } = fakeStandingDb();
    await applyAcademicStanding(db, PROFILE_ID, {
      status: "GRADUATED",
      graduatedTerm: "2025/2",
    });

    const actor = actorFor(graduates.has(PROFILE_ID));
    expect(canEditGraduateProfile(actor)).toBe(true);

    const parsed = validateGraduateProfile({
      company: " ACME ",
      jobTitle: "Desenvolvedora",
      linkedinUrl: "https://linkedin.com/in/mariana",
      githubUrl: "",
      contactEmail: "mariana@example.com",
      mentorshipAreasRaw: "Carreira, Primeiro estágio",
    });
    if ("error" in parsed) throw new Error(parsed.error);

    // O que a action gravaria + o toggle da vitrine, relido pela query.
    const row: ShowcaseSource = {
      ...parsed.value,
      mentorshipAvailable: true,
      showInShowcase: true,
      graduatedTerm: String(graduates.get(PROFILE_ID)?.graduatedTerm),
      studentProfile: {
        bio: null,
        user: { name: "Mariana Souza" },
        course: COURSE,
      },
    };

    const [card] = toShowcase([row]);
    expect(card).toMatchObject({
      name: "Mariana Souza",
      company: "ACME",
      jobTitle: "Desenvolvedora",
      contactEmail: "mariana@example.com",
      mentorshipAreas: ["Carreira", "Primeiro estágio"],
      graduatedTerm: "2025/2",
      courseName: "Engenharia de Software",
      campusName: "Sta Helena",
    });
  });

  it("egresso que desliga a vitrine some da listagem sem perder o perfil", async () => {
    const { db, graduates } = fakeStandingDb();
    await applyAcademicStanding(db, PROFILE_ID, { status: "GRADUATED" });

    const base: ShowcaseSource = {
      showInShowcase: false,
      jobTitle: "Desenvolvedora",
      company: "ACME",
      linkedinUrl: null,
      githubUrl: null,
      contactEmail: null,
      mentorshipAvailable: false,
      mentorshipAreas: [],
      graduatedTerm: null,
      studentProfile: {
        bio: null,
        user: { name: "Mariana Souza" },
        course: COURSE,
      },
    };

    expect(toShowcase([base])).toHaveLength(0);
    expect(toShowcase([{ ...base, showInShowcase: true }])).toHaveLength(1);
    // o perfil continua existindo — a transição não é desfeita
    expect(graduates.has(PROFILE_ID)).toBe(true);
    expect(canEditGraduateProfile(actorFor(true))).toBe(true);
  });

  it("re-sincronizar um já formado não recria nem apaga o perfil preenchido", async () => {
    const { db, graduates } = fakeStandingDb();
    await applyAcademicStanding(db, PROFILE_ID, {
      status: "GRADUATED",
      graduatedTerm: "2025/2",
    });
    graduates.set(PROFILE_ID, {
      ...graduates.get(PROFILE_ID),
      company: "ACME",
      showInShowcase: true,
    });

    // Fase 8: a sincronização com a UTFPR passa por aqui de novo.
    await applyAcademicStanding(db, PROFILE_ID, { status: "GRADUATED" });

    expect(graduates.get(PROFILE_ID)).toMatchObject({
      company: "ACME",
      showInShowcase: true,
      graduatedTerm: "2025/2",
    });
  });
});
