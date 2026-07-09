import type { AcademicStatus } from "../../generated/prisma/client";

// Student → graduate transition (Fase 3 decision, 2026-07-08):
// the rule fires from the mirrored data, no matter who wrote it — the seed
// today, the UtfprProvider sync in Fase 8, or an admin forcing it manually.
// When AcademicStanding.status becomes GRADUATED, the GraduateProfile is
// created (the StudentProfile stays — history is never lost).
//
// This module is import-safe outside Next.js (the seed uses it), so the
// database client is always passed in explicitly.

export type StandingInput = {
  status: AcademicStatus;
  currentPeriod?: number | null;
  gpa?: number | string | null;
  graduatedTerm?: string | null;
};

type StandingRecord = {
  status: AcademicStatus;
  currentPeriod: number | null;
  gpa: number | string | null;
  syncedAt: Date;
};

/// Minimal client surface: satisfied by PrismaClient and by test stubs.
export type StandingDb = {
  academicStanding: {
    upsert: (args: {
      where: { studentProfileId: string };
      update: StandingRecord;
      create: StandingRecord & { studentProfileId: string };
    }) => Promise<unknown>;
  };
  graduateProfile: {
    upsert: (args: {
      where: { studentProfileId: string };
      update: Record<string, never>;
      create: { studentProfileId: string; graduatedTerm: string | null };
    }) => Promise<unknown>;
  };
};

/// Writes a mirrored academic standing and applies the transition rule.
/// Single entry point for ALL writers of AcademicStanding.
export async function applyAcademicStanding(
  db: StandingDb,
  studentProfileId: string,
  standing: StandingInput,
): Promise<void> {
  const data = {
    status: standing.status,
    currentPeriod: standing.currentPeriod ?? null,
    gpa: standing.gpa ?? null,
    syncedAt: new Date(),
  };

  await db.academicStanding.upsert({
    where: { studentProfileId },
    update: data,
    create: { studentProfileId, ...data },
  });

  if (standing.status === "GRADUATED") {
    // Idempotent: re-syncs of an already graduated student change nothing.
    await db.graduateProfile.upsert({
      where: { studentProfileId },
      update: {},
      create: {
        studentProfileId,
        graduatedTerm: standing.graduatedTerm ?? null,
      },
    });
  }
}
