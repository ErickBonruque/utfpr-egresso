// The aluno → egresso transition rule (Fase 3): GRADUATED in the mirrored
// standing creates the GraduateProfile, no matter who wrote the standing.
import { describe, expect, it } from "vitest";
import {
  applyAcademicStanding,
  type StandingDb,
} from "../src/server/academic-standing";

type Row = Record<string, unknown>;

/// In-memory stub of the two tables the rule touches.
function fakeDb() {
  const standings = new Map<string, Row>();
  const graduates = new Map<string, Row>();
  const db: StandingDb = {
    academicStanding: {
      upsert: async ({ where, update, create }) => {
        const key = where.studentProfileId;
        standings.set(
          key,
          standings.has(key) ? { ...standings.get(key), ...update } : create,
        );
        return standings.get(key);
      },
    },
    graduateProfile: {
      upsert: async ({ where, update, create }) => {
        const key = where.studentProfileId;
        graduates.set(
          key,
          graduates.has(key) ? { ...graduates.get(key), ...update } : create,
        );
        return graduates.get(key);
      },
    },
  };
  return { db, standings, graduates };
}

describe("applyAcademicStanding", () => {
  it("mirrors the standing without creating a graduate profile for ACTIVE", async () => {
    const { db, standings, graduates } = fakeDb();
    await applyAcademicStanding(db, "sp-1", {
      status: "ACTIVE",
      currentPeriod: 5,
    });
    expect(standings.get("sp-1")).toMatchObject({
      status: "ACTIVE",
      currentPeriod: 5,
    });
    expect(graduates.size).toBe(0);
  });

  it("creates the graduate profile when status becomes GRADUATED", async () => {
    const { db, graduates } = fakeDb();
    await applyAcademicStanding(db, "sp-1", {
      status: "GRADUATED",
      graduatedTerm: "2025/2",
    });
    expect(graduates.get("sp-1")).toMatchObject({
      studentProfileId: "sp-1",
      graduatedTerm: "2025/2",
    });
  });

  it("is idempotent: a re-sync never overwrites the graduate profile", async () => {
    const { db, graduates } = fakeDb();
    await applyAcademicStanding(db, "sp-1", {
      status: "GRADUATED",
      graduatedTerm: "2025/2",
    });
    // Simulate alumni data enriched later (Fase 7 profile edits).
    graduates.set("sp-1", { ...graduates.get("sp-1"), company: "ACME" });

    await applyAcademicStanding(db, "sp-1", { status: "GRADUATED" });
    expect(graduates.get("sp-1")).toMatchObject({
      company: "ACME",
      graduatedTerm: "2025/2",
    });
  });

  it("updates an existing standing on re-sync (ACTIVE → GRADUATED)", async () => {
    const { db, standings, graduates } = fakeDb();
    await applyAcademicStanding(db, "sp-1", {
      status: "ACTIVE",
      currentPeriod: 8,
    });
    await applyAcademicStanding(db, "sp-1", {
      status: "GRADUATED",
      graduatedTerm: "2026/1",
    });
    expect(standings.get("sp-1")).toMatchObject({ status: "GRADUATED" });
    expect(graduates.has("sp-1")).toBe(true);
  });
});
