// Guards the integrity of the base gamification content (Fase 3): every
// subject code must exist in the curricula, track parents must be declared
// before their children (the seed relies on that order) and careers must
// point at real track nodes.
import { describe, expect, it } from "vitest";
import gamification from "../prisma/data/gamification-base.json";
import seed from "../prisma/data/santa-helena.json";

const subjectCodesByCourse = new Map(
  seed.courses.map((c) => [c.name, new Set(c.subjects.map((s) => s.code))]),
);

describe("gamification base (gamification-base.json)", () => {
  it("covers exactly the 3 Santa Helena courses", () => {
    expect(gamification.courses.map((c) => c.course).sort()).toEqual(
      [...subjectCodesByCourse.keys()].sort(),
    );
  });

  it.each(gamification.courses.map((c) => [c.course, c] as const))(
    "%s references only real subject codes",
    (name, course) => {
      const codes = subjectCodesByCourse.get(name);
      expect(codes).toBeDefined();
      for (const a of course.achievements) {
        for (const code of (a.criteria as { subjectCodes?: string[] })
          .subjectCodes ?? []) {
          expect(codes?.has(code), `${a.name}: ${code}`).toBe(true);
        }
        // Fase 6.2: min_grade_in_subject referencia uma disciplina única.
        const singleSubject = (a.criteria as { subjectCode?: string })
          .subjectCode;
        if (singleSubject) {
          expect(codes?.has(singleSubject), `${a.name}: ${singleSubject}`).toBe(
            true,
          );
        }
      }
      for (const t of course.tracks) {
        for (const n of t.nodes) {
          for (const code of n.requires) {
            expect(codes?.has(code), `${n.name}: ${code}`).toBe(true);
          }
        }
      }
    },
  );

  it.each(gamification.courses.map((c) => [c.course, c] as const))(
    "%s declares track parents before children and valid career nodes",
    (_name, course) => {
      const keys = new Set<string>();
      for (const t of course.tracks) {
        for (const n of t.nodes) {
          if (n.parent !== null) {
            expect(keys.has(n.parent), `${n.key} → ${n.parent}`).toBe(true);
          }
          expect(["CORE", "BRANCH"]).toContain(n.kind);
          expect(n.xpReward).toBeGreaterThan(0);
          expect(keys.has(n.key)).toBe(false);
          keys.add(n.key);
        }
      }
      expect(course.careers.length).toBeGreaterThan(0);
      for (const c of course.careers) {
        expect(c.nodes.length).toBeGreaterThan(0);
        for (const key of c.nodes) {
          expect(keys.has(key), `${c.name}: ${key}`).toBe(true);
        }
      }
    },
  );

  it.each(gamification.courses.map((c) => [c.course, c] as const))(
    "%s has unique achievement names with valid criteria",
    (_name, course) => {
      const names = new Set<string>();
      for (const a of course.achievements) {
        expect(names.has(a.name)).toBe(false);
        names.add(a.name);
        expect(a.xpReward).toBeGreaterThan(0);
        // Fase 6.2: allowlist estendida com nota/CR/período/carga.
        expect([
          "subjects_approved",
          "subjects_approved_count",
          "min_grade_in_subject",
          "min_gpa",
          "approved_full_period",
          "workload_pct",
        ]).toContain((a.criteria as { type: string }).type);
      }
    },
  );
});
