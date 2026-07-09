"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { requireAdmin } from "@/server/actor";
import { forceGraduation } from "@/server/graduation";

/// Admin fallback for the aluno → egresso transition while there is no UTFPR
/// integration. Scope is enforced inside forceGraduation.
export async function graduateStudent(
  studentProfileId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    await forceGraduation(actor, studentProfileId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao formar aluno." };
  }
  revalidatePath("/admin/alunos");
}
