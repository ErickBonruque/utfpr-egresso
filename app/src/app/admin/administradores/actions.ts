"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import type { AdminRole } from "@/lib/authz";
import { requireAdmin } from "@/server/actor";
import {
  cancelInvite,
  createAdminInvite,
  revokeAdminAssignment,
} from "@/server/admin-invites";

const ROLES: AdminRole[] = ["SUPER_ADMIN", "CAMPUS_ADMIN", "COURSE_ADMIN"];

export async function inviteAdmin(
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();

  const role = String(formData.get("role") ?? "") as AdminRole;
  if (!ROLES.includes(role)) return { error: "Papel inválido." };

  // Normalize the scope to the Fase 1 shape convention for the role.
  const campusId =
    role === "CAMPUS_ADMIN" ? String(formData.get("campusId") ?? "") : null;
  const courseId =
    role === "COURSE_ADMIN" ? String(formData.get("courseId") ?? "") : null;
  if (role === "CAMPUS_ADMIN" && !campusId) {
    return { error: "Selecione o campus." };
  }
  if (role === "COURSE_ADMIN" && !courseId) {
    return { error: "Selecione o curso." };
  }

  try {
    await createAdminInvite(actor, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role,
      campusId: campusId || null,
      courseId: courseId || null,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível convidar.",
    };
  }
  revalidatePath("/admin/administradores");
}

export async function cancelInviteAction(
  inviteId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    await cancelInvite(actor, inviteId);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível cancelar o convite.",
    };
  }
  revalidatePath("/admin/administradores");
}

export async function revokeAssignmentAction(
  assignmentId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    await revokeAdminAssignment(actor, assignmentId);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível revogar o papel.",
    };
  }
  revalidatePath("/admin/administradores");
}
