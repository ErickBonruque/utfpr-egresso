// Revisão da Fase 7: "a vitrine só expõe campos marcados como públicos".
// A projeção de src/lib/showcase.ts é a política de privacidade em código —
// estes testes travam a allow-list contra vazamento acidental (alguém amplia
// o `select` da query, ou adiciona campo ao GraduateProfile).
import { describe, expect, it } from "vitest";
import {
  isVisibleInShowcase,
  SHOWCASE_PUBLIC_FIELDS,
  type ShowcaseSource,
  toShowcase,
  toShowcaseEntry,
} from "../src/lib/showcase";

function source(overrides: Partial<ShowcaseSource> = {}): ShowcaseSource {
  return {
    showInShowcase: true,
    jobTitle: "Desenvolvedora",
    company: "ACME",
    linkedinUrl: "https://linkedin.com/in/mariana",
    githubUrl: null,
    contactEmail: "mariana@example.com",
    mentorshipAvailable: true,
    mentorshipAreas: ["Carreira", "Primeiro estágio"],
    graduatedTerm: "2025/2",
    studentProfile: {
      bio: "Formada em 2025.",
      user: { name: "Mariana Souza" },
      course: {
        name: "Engenharia de Software",
        campus: { name: "Sta Helena" },
      },
    },
    ...overrides,
  };
}

describe("opt-in da vitrine", () => {
  it("publica quem ligou showInShowcase", () => {
    expect(isVisibleInShowcase({ showInShowcase: true })).toBe(true);
    expect(isVisibleInShowcase({ showInShowcase: false })).toBe(false);
  });

  it("descarta perfis ocultos mesmo se a query esquecer o filtro", () => {
    const rows = [source(), source({ showInShowcase: false })];
    const published = toShowcase(rows);
    expect(published).toHaveLength(1);
    expect(published[0].name).toBe("Mariana Souza");
  });
});

describe("allow-list dos campos publicados", () => {
  it("emite exatamente os campos públicos, nem um a mais", () => {
    const entry = toShowcaseEntry(source());
    expect(Object.keys(entry).sort()).toEqual(
      [...SHOWCASE_PUBLIC_FIELDS].sort(),
    );
  });

  it("não carrega dado sensível que venha junto da linha do banco", () => {
    // Linha "gorda": o que uma query descuidada (include em vez de select)
    // traria do User e do StudentProfile.
    const fat = {
      ...source(),
      id: "gp-1",
      studentProfileId: "sp-1",
      updatedAt: new Date(),
      studentProfile: {
        ...source().studentProfile,
        id: "sp-1",
        ra: "a2190001",
        user: { name: "Mariana Souza", email: "mariana@login.utfpr.edu.br" },
      },
    };

    const serialized = JSON.stringify(toShowcaseEntry(fat));
    expect(serialized).not.toContain("mariana@login.utfpr.edu.br");
    expect(serialized).not.toContain("a2190001");
    expect(serialized).not.toContain("sp-1");
    // o contato opt-in continua saindo — é o único e-mail publicável
    expect(serialized).toContain("mariana@example.com");
  });
});

describe("mentoria", () => {
  it("publica as áreas de quem está disponível", () => {
    const entry = toShowcaseEntry(source({ mentorshipAvailable: true }));
    expect(entry.mentorshipAreas).toEqual(["Carreira", "Primeiro estágio"]);
  });

  it("omite as áreas quando o egresso desliga a mentoria", () => {
    const entry = toShowcaseEntry(
      source({ mentorshipAvailable: false, mentorshipAreas: ["Carreira"] }),
    );
    expect(entry.mentorshipAvailable).toBe(false);
    expect(entry.mentorshipAreas).toEqual([]);
  });
});

describe("campos vazios", () => {
  it("mantém null nos opcionais não preenchidos (a UI ramifica neles)", () => {
    const entry = toShowcaseEntry(
      source({
        jobTitle: null,
        company: null,
        linkedinUrl: null,
        contactEmail: null,
        graduatedTerm: null,
      }),
    );
    expect(entry).toMatchObject({
      jobTitle: null,
      company: null,
      linkedinUrl: null,
      githubUrl: null,
      contactEmail: null,
      graduatedTerm: null,
    });
    // identificação institucional nunca é opcional na vitrine
    expect(entry.name).toBe("Mariana Souza");
    expect(entry.courseName).toBe("Engenharia de Software");
    expect(entry.campusName).toBe("Sta Helena");
  });
});
