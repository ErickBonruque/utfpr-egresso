// Guards the integrity of the committed seed dataset: if the curriculum
// sources are regenerated, these invariants must still hold before seeding.
import { describe, expect, it } from "vitest";
import seed from "../prisma/data/santa-helena.json";

describe("seed data (santa-helena.json)", () => {
  it("has the Santa Helena campus and its 3 courses", () => {
    expect(seed.campus.code).toBe("SH");
    expect(seed.courses).toHaveLength(3);
    expect(seed.courses.map((c) => c.name).sort()).toEqual([
      "Agronomia",
      "Ciência da Computação",
      "Licenciatura em Ciências Biológicas",
    ]);
  });

  it.each(seed.courses.map((c) => [c.name, c] as const))(
    "%s has valid, unique subjects",
    (_name, course) => {
      expect(course.subjects.length).toBeGreaterThan(0);
      const codes = new Set<string>();
      for (const s of course.subjects) {
        expect(s.code).toMatch(/^[A-Z0-9]+$/);
        expect(s.name.length).toBeGreaterThan(1);
        expect(s.workloadHours).toBeGreaterThan(0);
        expect(s.period).toBeGreaterThanOrEqual(1);
        expect(s.period).toBeLessThanOrEqual(10);
        // elective subjects must carry their elective group and vice versa
        expect(s.isElective).toBe(s.electiveGroup !== null);
        expect(codes.has(s.code)).toBe(false);
        codes.add(s.code);
      }
    },
  );
});
