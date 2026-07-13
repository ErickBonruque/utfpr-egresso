"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/server/actor";
import { prisma } from "@/server/db";

export type ProfileActionResult = { error?: string } | undefined;

const URL_PATTERN = /^https?:\/\/\S+$/i;

/// Updates the student's self-service fields (Fase 6). Academic data is
/// read-only here — it mirrors UTFPR. These fields pre-fill the
/// GraduateProfile on the aluno → egresso transition (Fase 7).
export async function updateStudentProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const actor = await requireStudent();

  const bio = String(formData.get("bio") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();
  const githubUrl = String(formData.get("githubUrl") ?? "").trim();

  if (bio.length > 500) {
    return { error: "A bio pode ter no máximo 500 caracteres." };
  }
  for (const [label, url] of [
    ["LinkedIn", linkedinUrl],
    ["GitHub", githubUrl],
  ] as const) {
    if (url !== "" && !URL_PATTERN.test(url)) {
      return {
        error: `O link do ${label} precisa começar com http:// ou https://.`,
      };
    }
    if (url.length > 300) {
      return { error: `O link do ${label} é longo demais.` };
    }
  }

  await prisma.studentProfile.update({
    where: { id: actor.student?.profileId },
    data: {
      bio: bio === "" ? null : bio,
      linkedinUrl: linkedinUrl === "" ? null : linkedinUrl,
      githubUrl: githubUrl === "" ? null : githubUrl,
    },
  });

  revalidatePath("/perfil");
  return undefined;
}
