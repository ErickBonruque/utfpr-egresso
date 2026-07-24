// Fase 7: validation of GraduateProfile edits (pure helper, no DB).
// Mirrors the criteria.test.ts pattern — valid / boundary / invalid triples.
import { describe, expect, it } from "vitest";
import {
  MAX_AREA_LEN,
  MAX_AREAS,
  MAX_COMPANY_LEN,
  MAX_JOBTITLE_LEN,
  validateGraduateProfile,
} from "../src/lib/graduate-profile";

const VALID = {
  company: "Cooperativa Agroindustrial Lar",
  jobTitle: "Desenvolvedora de Software",
  linkedinUrl: "https://www.linkedin.com/in/mariana",
  githubUrl: "https://github.com/mariana",
  contactEmail: "mariana@example.com",
  mentorshipAreasRaw: "Carreira, Primeiro estágio",
};

function input(overrides: Partial<typeof VALID> = {}) {
  return { ...VALID, ...overrides };
}

describe("validateGraduateProfile — happy path", () => {
  it("accepts a fully populated profile and parses areas", () => {
    const r = validateGraduateProfile(input());
    expect("value" in r).toBe(true);
    if ("value" in r) {
      expect(r.value).toEqual({
        company: VALID.company,
        jobTitle: VALID.jobTitle,
        linkedinUrl: VALID.linkedinUrl,
        githubUrl: VALID.githubUrl,
        contactEmail: VALID.contactEmail,
        mentorshipAreas: ["Carreira", "Primeiro estágio"],
      });
    }
  });

  it("accepts an empty profile (all fields nullable)", () => {
    const r = validateGraduateProfile({
      company: "",
      jobTitle: "",
      linkedinUrl: "",
      githubUrl: "",
      contactEmail: "",
      mentorshipAreasRaw: "",
    });
    expect("value" in r).toBe(true);
    if ("value" in r) {
      expect(r.value).toEqual({
        company: null,
        jobTitle: null,
        linkedinUrl: null,
        githubUrl: null,
        contactEmail: null,
        mentorshipAreas: [],
      });
    }
  });

  it("trims whitespace everywhere and drops empty areas", () => {
    const r = validateGraduateProfile(
      input({
        company: "  ACME  ",
        mentorshipAreasRaw: " Carreira , , , Banco de dados ",
      }),
    );
    expect("value" in r).toBe(true);
    if ("value" in r) {
      expect(r.value.company).toBe("ACME");
      expect(r.value.mentorshipAreas).toEqual(["Carreira", "Banco de dados"]);
    }
  });

  it("accepts contact email at the boundary length", () => {
    const r = validateGraduateProfile(input({ contactEmail: "a@b.co" }));
    expect("value" in r).toBe(true);
  });
});

describe("validateGraduateProfile — boundary limits", () => {
  it(`rejects company longer than ${MAX_COMPANY_LEN}`, () => {
    const r = validateGraduateProfile(
      input({ company: "x".repeat(MAX_COMPANY_LEN + 1) }),
    );
    expect("error" in r).toBe(true);
  });

  it(`rejects jobTitle longer than ${MAX_JOBTITLE_LEN}`, () => {
    const r = validateGraduateProfile(
      input({ jobTitle: "x".repeat(MAX_JOBTITLE_LEN + 1) }),
    );
    expect("error" in r).toBe(true);
  });

  it(`rejects more than ${MAX_AREAS} mentorship areas`, () => {
    const r = validateGraduateProfile(
      input({
        mentorshipAreasRaw: Array(MAX_AREAS + 1)
          .fill("área")
          .join(","),
      }),
    );
    expect("error" in r).toBe(true);
  });

  it(`rejects a mentorship area longer than ${MAX_AREA_LEN}`, () => {
    const r = validateGraduateProfile(
      input({ mentorshipAreasRaw: "x".repeat(MAX_AREA_LEN + 1) }),
    );
    expect("error" in r).toBe(true);
  });
});

describe("validateGraduateProfile — invalid formats", () => {
  it.each([
    "not-an-email",
    "missing@domain",
    "@nodomain.com",
    "space in@email.com",
  ])("rejects invalid contact email %s", (email) => {
    const r = validateGraduateProfile(input({ contactEmail: email }));
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error).toMatch(/e-mail/i);
  });

  it.each(["linkedin.com/in/voce", "ftp://linkedin.com/in/voce"])(
    "rejects linkedinUrl without http(s): %s",
    (url) => {
      const r = validateGraduateProfile(input({ linkedinUrl: url }));
      expect("error" in r).toBe(true);
      if ("error" in r) expect(r.error).toMatch(/linkedin/i);
    },
  );

  it("rejects githubUrl without http(s)", () => {
    const r = validateGraduateProfile(input({ githubUrl: "github.com/x" }));
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error).toMatch(/github/i);
  });
});
