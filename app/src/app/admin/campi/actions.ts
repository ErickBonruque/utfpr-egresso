"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { isSuperAdmin } from "@/lib/authz";
import { DomainError } from "@/lib/errors";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { actionCatch } from "@/server/logger";

async function requireSuperAdmin() {
  const actor = await requireAdmin();
  if (!isSuperAdmin(actor)) {
    throw new DomainError("Apenas a administração geral gerencia campi.");
  }
  return actor;
}

function readCampusForm(
  formData: FormData,
):
  | { error: string }
  | { data: { code: string; name: string; city: string; state: string } } {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "PR")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2,4}$/.test(code)) {
    return { error: "Sigla inválida — use 2 a 4 letras (ex: SH, CT)." };
  }
  if (!name || !city) {
    return { error: "Nome e cidade são obrigatórios." };
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    return { error: "UF inválida — use 2 letras (ex: PR)." };
  }
  return { data: { code, name, city, state } };
}

export async function createCampus(
  formData: FormData,
): Promise<FormActionResult> {
  await requireSuperAdmin();
  const parsed = readCampusForm(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.campus.create({ data: parsed.data });
  } catch (e) {
    return actionCatch(
      "action.create_campus",
      e,
      `Já existe um campus com a sigla ${parsed.data.code}.`,
    );
  }
  revalidatePath("/admin/campi");
}

export async function updateCampus(
  campusId: string,
  formData: FormData,
): Promise<FormActionResult> {
  await requireSuperAdmin();
  const parsed = readCampusForm(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.campus.update({ where: { id: campusId }, data: parsed.data });
  } catch (e) {
    return actionCatch(
      "action.update_campus",
      e,
      "Não foi possível salvar — verifique se a sigla é única.",
      { campusId },
    );
  }
  revalidatePath("/admin/campi");
}

export async function deleteCampus(
  campusId: string,
): Promise<FormActionResult> {
  await requireSuperAdmin();

  // Course → Campus is onDelete: Restrict, but checking first gives a
  // friendlier message than the FK error.
  const courses = await prisma.course.count({ where: { campusId } });
  if (courses > 0) {
    return {
      error: `Este campus tem ${courses} curso(s) — remova-os antes de excluir.`,
    };
  }
  await prisma.campus.delete({ where: { id: campusId } });
  revalidatePath("/admin/campi");
}
