"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { isSuperAdmin } from "@/lib/authz";
import { getAcademicProvider } from "@/server/academic";
import { runAcademicSync } from "@/server/academic/sync";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

/// Dispara a sincronização acadêmica pela tela do admin (Fase 8). Mesma
/// rotina da CLI — aqui só muda quem dispara, o que fica registrado no log.
///
/// Restrito a SUPER_ADMIN: a varredura é institucional (todos os alunos de
/// todos os campi), fora do escopo de um CAMPUS_ADMIN/COURSE_ADMIN. Eles
/// continuam vendo o histórico, que é informação de saúde do sistema.
export async function triggerAcademicSync(): Promise<FormActionResult> {
  const actor = await requireAdmin();
  if (!isSuperAdmin(actor)) {
    return { error: "Apenas o administrador geral dispara a sincronização." };
  }

  try {
    const summary = await runAcademicSync(prisma, getAcademicProvider(prisma), {
      triggeredBy: "admin",
      triggeredByUserId: actor.userId,
    });
    revalidatePath("/admin/sincronizacao");
    if (summary.status === "FAILED") {
      return {
        error: summary.message ?? "A sincronização falhou. Veja o histórico.",
      };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao sincronizar.",
    };
  }
}
