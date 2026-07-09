"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/actor";
import { forceGraduation } from "@/server/graduation";

/// Admin fallback for the aluno → egresso transition while there is no UTFPR
/// integration. Scope is enforced inside forceGraduation.
export async function graduateStudent(formData: FormData) {
  const studentProfileId = formData.get("studentProfileId");
  if (typeof studentProfileId !== "string" || !studentProfileId) {
    throw new Error("Aluno inválido.");
  }
  const graduatedTerm = formData.get("graduatedTerm");

  const actor = await requireAdmin();
  await forceGraduation(
    actor,
    studentProfileId,
    typeof graduatedTerm === "string" && graduatedTerm
      ? graduatedTerm
      : undefined,
  );
  revalidatePath("/admin");
}
