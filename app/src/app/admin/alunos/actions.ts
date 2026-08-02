"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { requireAdmin } from "@/server/actor";
import { forceGraduation } from "@/server/graduation";
import { actionCatch } from "@/server/logger";

/// Admin fallback for the aluno → egresso transition while there is no UTFPR
/// integration. Scope is enforced inside forceGraduation.
export async function graduateStudent(
  studentProfileId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    await forceGraduation(actor, studentProfileId);
  } catch (e) {
    return actionCatch("action.graduate_student", e, "Erro ao formar aluno.", {
      studentProfileId,
    });
  }
  revalidatePath("/admin/alunos");
}
