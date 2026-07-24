"use server";

import { revalidatePath } from "next/cache";
import { validateGraduateProfile } from "@/lib/graduate-profile";
import { requireStudent } from "@/server/actor";
import { prisma } from "@/server/db";
import type { ProfileActionResult } from "./actions";

/// Edits the GraduateProfile (Fase 7). Only callable by an actual egresso
/// (actor.student.isGraduate) — the GraduateProfile is created on the
/// aluno → egresso transition, so it always exists by the time we get here.
/// Validation lives in the pure helper (src/lib/graduate-profile.ts) so it
/// can be unit-tested without DB/session. Revalidates /perfil (the form) and
/// /egressos (the showcase reflects the edited fields).
export async function updateGraduateProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const actor = await requireStudent();
  if (!actor.student?.isGraduate) {
    return {
      error: "Apenas egressos podem editar o perfil de egresso.",
    };
  }

  const result = validateGraduateProfile({
    company: String(formData.get("company") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    githubUrl: String(formData.get("githubUrl") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    mentorshipAreasRaw: String(formData.get("mentorshipAreas") ?? ""),
  });
  if ("error" in result) return { error: result.error };
  const value = result.value;

  // Checkboxes are absent from formData when unchecked — "on" when checked.
  const mentorshipAvailable = formData.get("mentorshipAvailable") === "on";
  const showInShowcase = formData.get("showInShowcase") === "on";

  await prisma.graduateProfile.update({
    where: { studentProfileId: actor.student.profileId },
    data: {
      ...value,
      mentorshipAvailable,
      showInShowcase,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/egressos");
  return undefined;
}
