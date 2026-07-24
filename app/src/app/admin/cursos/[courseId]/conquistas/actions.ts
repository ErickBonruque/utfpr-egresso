"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { CriteriaError, parseCriteriaInput } from "@/lib/criteria";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { Prisma } from "../../../../../../generated/prisma/client";

function revalidate(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}/conquistas`);
}

function readAchievementForm(
  formData: FormData,
  validSubjectCodes: Set<string>,
):
  | { error: string }
  | {
      data: {
        name: string;
        description: string;
        category: string;
        icon: string | null;
        xpReward: number;
        criteria: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      };
    } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const xpReward = Number(formData.get("xpReward"));

  if (!name || !description || !category) {
    return { error: "Nome, descrição e categoria são obrigatórios." };
  }
  if (!Number.isInteger(xpReward) || xpReward < 0) {
    return { error: "XP deve ser um inteiro maior ou igual a 0." };
  }

  let criteria: ReturnType<typeof parseCriteriaInput>;
  try {
    criteria = parseCriteriaInput(String(formData.get("criteria") ?? ""));
  } catch (e) {
    if (e instanceof CriteriaError) return { error: e.message };
    throw e;
  }
  if (criteria?.type === "subjects_approved") {
    const unknown = criteria.subjectCodes.filter(
      (code) => !validSubjectCodes.has(code),
    );
    if (unknown.length > 0) {
      return {
        error: `Disciplinas fora do curso no critério: ${unknown.join(", ")}.`,
      };
    }
  }
  if (
    criteria?.type === "min_grade_in_subject" &&
    !validSubjectCodes.has(criteria.subjectCode)
  ) {
    return {
      error: `Disciplina fora do curso no critério: ${criteria.subjectCode}.`,
    };
  }

  return {
    data: {
      name,
      description,
      category,
      icon,
      xpReward,
      // Prisma requires the JsonNull sentinel to store SQL NULL in Json?.
      criteria: criteria
        ? (criteria as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  };
}

async function courseSubjectCodes(courseId: string): Promise<Set<string>> {
  const subjects = await prisma.subject.findMany({
    where: { courseId },
    select: { code: true },
  });
  return new Set(subjects.map((s) => s.code));
}

export async function createAchievement(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    await assertCanManageCourse(actor, courseId);
    const parsed = readAchievementForm(
      formData,
      await courseSubjectCodes(courseId),
    );
    if ("error" in parsed) return parsed;
    await prisma.achievement.create({
      data: { courseId, ...parsed.data },
    });
    revalidate(courseId);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível criar a conquista.",
    };
  }
}

export async function updateAchievement(
  achievementId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { courseId: true },
    });
    if (!achievement) return { error: "Conquista não encontrada." };
    await assertCanManageCourse(actor, achievement.courseId);
    const parsed = readAchievementForm(
      formData,
      await courseSubjectCodes(achievement.courseId),
    );
    if ("error" in parsed) return parsed;
    await prisma.achievement.update({
      where: { id: achievementId },
      data: parsed.data,
    });
    revalidate(achievement.courseId);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível salvar a conquista.",
    };
  }
}

export async function toggleAchievementActive(
  achievementId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { courseId: true, isActive: true },
    });
    if (!achievement) return { error: "Conquista não encontrada." };
    await assertCanManageCourse(actor, achievement.courseId);
    await prisma.achievement.update({
      where: { id: achievementId },
      data: { isActive: !achievement.isActive },
    });
    revalidate(achievement.courseId);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível alterar a conquista.",
    };
  }
}

export async function deleteAchievement(
  achievementId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { courseId: true },
    });
    if (!achievement) return { error: "Conquista não encontrada." };
    await assertCanManageCourse(actor, achievement.courseId);
    // AchievementProgress cascades by schema.
    await prisma.achievement.delete({ where: { id: achievementId } });
    revalidate(achievement.courseId);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível excluir a conquista.",
    };
  }
}
