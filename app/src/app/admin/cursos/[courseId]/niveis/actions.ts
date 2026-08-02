"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { DomainError } from "@/lib/errors";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { actionCatch } from "@/server/logger";

function revalidate(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}/niveis`);
}

function readLevelForm(
  formData: FormData,
):
  | { error: string }
  | { data: { level: number; minXp: number; title: string } } {
  const level = Number(formData.get("level"));
  const minXp = Number(formData.get("minXp"));
  const title = String(formData.get("title") ?? "").trim();

  if (!Number.isInteger(level) || level < 1) {
    return { error: "Nível deve ser um inteiro maior ou igual a 1." };
  }
  if (!Number.isInteger(minXp) || minXp < 0) {
    return { error: "XP mínimo deve ser um inteiro maior ou igual a 0." };
  }
  if (!title) return { error: "Informe o título do nível." };
  return { data: { level, minXp, title } };
}

/// XP thresholds must grow with the level, or the engine (Fase 6) would
/// resolve levels ambiguously.
async function assertMonotonic(
  courseId: string,
  level: number,
  minXp: number,
  ignoreId?: string,
) {
  const others = await prisma.levelDefinition.findMany({
    where: { courseId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { level: true, minXp: true },
  });
  for (const other of others) {
    if (other.level < level && other.minXp >= minXp) {
      throw new DomainError(
        `XP mínimo deve ser maior que o do nível ${other.level} (${other.minXp} XP).`,
      );
    }
    if (other.level > level && other.minXp <= minXp) {
      throw new DomainError(
        `XP mínimo deve ser menor que o do nível ${other.level} (${other.minXp} XP).`,
      );
    }
  }
}

export async function createLevel(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const parsed = readLevelForm(formData);
  if ("error" in parsed) return parsed;

  try {
    await assertCanManageCourse(actor, courseId);
    await assertMonotonic(courseId, parsed.data.level, parsed.data.minXp);
    await prisma.levelDefinition.create({
      data: { courseId, ...parsed.data },
    });
    revalidate(courseId);
  } catch (e) {
    return actionCatch(
      "action.create_level",
      e,
      `Já existe o nível ${parsed.data.level} neste curso.`,
    );
  }
}

export async function updateLevel(
  levelId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const parsed = readLevelForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const existing = await prisma.levelDefinition.findUnique({
      where: { id: levelId },
      select: { courseId: true },
    });
    if (!existing) return { error: "Nível não encontrado." };
    await assertCanManageCourse(actor, existing.courseId);
    await assertMonotonic(
      existing.courseId,
      parsed.data.level,
      parsed.data.minXp,
      levelId,
    );
    await prisma.levelDefinition.update({
      where: { id: levelId },
      data: parsed.data,
    });
    revalidate(existing.courseId);
  } catch (e) {
    return actionCatch(
      "action.update_level",
      e,
      "Não foi possível salvar o nível.",
    );
  }
}

export async function deleteLevel(levelId: string): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const existing = await prisma.levelDefinition.findUnique({
      where: { id: levelId },
      select: { courseId: true },
    });
    if (!existing) return { error: "Nível não encontrado." };
    await assertCanManageCourse(actor, existing.courseId);
    await prisma.levelDefinition.delete({ where: { id: levelId } });
    revalidate(existing.courseId);
  } catch (e) {
    return actionCatch(
      "action.delete_level",
      e,
      "Não foi possível excluir o nível.",
    );
  }
}
