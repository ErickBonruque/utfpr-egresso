import type { Actor } from "@/lib/authz";
import type { Prisma } from "../../generated/prisma/client";
import { applyAcademicStanding } from "./academic-standing";
import { assertCanManageCourse } from "./actor";
import { prisma } from "./db";

/// Admin fallback while the UTFPR integration does not exist: force the
/// student → graduate transition manually. Goes through the same rule as
/// the sync (applyAcademicStanding).
export async function forceGraduation(
  actor: Actor,
  studentProfileId: string,
  graduatedTerm?: string,
): Promise<void> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: {
      courseId: true,
      academicStanding: { select: { gpa: true, currentPeriod: true } },
    },
  });
  if (!profile) throw new Error("Aluno não encontrado.");

  await assertCanManageCourse(actor, profile.courseId);

  await applyAcademicStanding(prisma, studentProfileId, {
    status: "GRADUATED",
    currentPeriod: profile.academicStanding?.currentPeriod ?? null,
    gpa: (profile.academicStanding?.gpa as Prisma.Decimal | null)?.toString(),
    graduatedTerm,
  });
}
