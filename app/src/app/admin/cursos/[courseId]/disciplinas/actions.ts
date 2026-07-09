"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { parseCurriculumImport } from "@/lib/curriculum-import";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof Error ? e.message : fallback };
}

function revalidate(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}/disciplinas`);
}

/// Resolves an entry to its course, enforcing scope on entry-level actions.
async function requireEntry(entryId: string) {
  const actor = await requireAdmin();
  const entry = await prisma.curriculumEntry.findUnique({
    where: { id: entryId },
    include: { curriculum: { select: { courseId: true } } },
  });
  if (!entry) throw new Error("Disciplina não encontrada na matriz.");
  await assertCanManageCourse(actor, entry.curriculum.courseId);
  return entry;
}

function readSubjectForm(formData: FormData):
  | { error: string }
  | {
      data: {
        code: string;
        name: string;
        workloadHours: number;
        period: number;
        isElective: boolean;
        electiveGroup: string | null;
      };
    } {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const workloadHours = Number(formData.get("workloadHours"));
  const period = Number(formData.get("period"));
  const isElective = formData.get("isElective") === "on";
  const electiveGroup =
    String(formData.get("electiveGroup") ?? "").trim() || null;

  if (!code || !name) return { error: "Código e nome são obrigatórios." };
  if (!Number.isInteger(workloadHours) || workloadHours <= 0) {
    return { error: "Carga horária deve ser um inteiro positivo." };
  }
  if (!Number.isInteger(period) || period < 0) {
    return { error: "Período deve ser um inteiro (0 para eletivas)." };
  }
  return {
    data: {
      code,
      name,
      workloadHours,
      period,
      isElective: isElective || period === 0,
      electiveGroup,
    },
  };
}

export async function createCurriculum(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const version = String(formData.get("version") ?? "").trim();
  if (!/^\d{4}\/[12]$/.test(version)) {
    return { error: 'Versão inválida — use o formato "2026/1".' };
  }

  try {
    await assertCanManageCourse(actor, courseId);
    await prisma.curriculum.create({ data: { courseId, version } });
  } catch (e) {
    return fail(e, `Já existe a matriz ${version} neste curso.`);
  }
  revalidate(courseId);
}

export async function toggleCurriculumActive(
  curriculumId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });
    if (!curriculum) return { error: "Matriz não encontrada." };
    await assertCanManageCourse(actor, curriculum.courseId);
    await prisma.curriculum.update({
      where: { id: curriculumId },
      data: { isActive: !curriculum.isActive },
    });
    revalidate(curriculum.courseId);
  } catch (e) {
    return fail(e, "Não foi possível alterar a matriz.");
  }
}

export async function deleteCurriculum(
  curriculumId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });
    if (!curriculum) return { error: "Matriz não encontrada." };
    await assertCanManageCourse(actor, curriculum.courseId);
    await prisma.curriculum.delete({ where: { id: curriculumId } });
    revalidate(curriculum.courseId);
  } catch (e) {
    return fail(e, "Não foi possível excluir a matriz.");
  }
}

/// Creates (or reuses, by code) a subject and places it in the curriculum.
export async function createSubjectInCurriculum(
  courseId: string,
  curriculumId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const parsed = readSubjectForm(formData);
  if ("error" in parsed) return parsed;
  const { code, name, workloadHours, period, isElective, electiveGroup } =
    parsed.data;

  try {
    await assertCanManageCourse(actor, courseId);
    await prisma.$transaction(async (tx) => {
      const subject = await tx.subject.upsert({
        where: { courseId_code: { courseId, code } },
        update: { name, workloadHours },
        create: { courseId, code, name, workloadHours },
      });
      await tx.curriculumEntry.upsert({
        where: {
          curriculumId_subjectId: { curriculumId, subjectId: subject.id },
        },
        update: { period, isElective, electiveGroup },
        create: {
          curriculumId,
          subjectId: subject.id,
          period,
          isElective,
          electiveGroup,
        },
      });
    });
  } catch (e) {
    return fail(e, "Não foi possível salvar a disciplina.");
  }
  revalidate(courseId);
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const parsed = readSubjectForm(formData);
  if ("error" in parsed) return parsed;
  const { name, workloadHours, period, isElective, electiveGroup } =
    parsed.data;

  try {
    const entry = await requireEntry(entryId);
    await prisma.$transaction([
      prisma.subject.update({
        where: { id: entry.subjectId },
        data: { name, workloadHours },
      }),
      prisma.curriculumEntry.update({
        where: { id: entryId },
        data: { period, isElective, electiveGroup },
      }),
    ]);
    revalidate(entry.curriculum.courseId);
  } catch (e) {
    return fail(e, "Não foi possível salvar a disciplina.");
  }
}

/// Removes the subject from this curriculum version only (the subject record
/// stays — it may belong to other versions or have enrollments).
export async function removeEntry(entryId: string): Promise<FormActionResult> {
  try {
    const entry = await requireEntry(entryId);
    await prisma.curriculumEntry.delete({ where: { id: entryId } });
    revalidate(entry.curriculum.courseId);
  } catch (e) {
    return fail(e, "Não foi possível remover a disciplina da matriz.");
  }
}

/// Deletes a subject that is in no curriculum. Enrollment references block
/// the delete (Restrict); track requirements cascade.
export async function deleteSubject(
  subjectId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { _count: { select: { curriculumEntries: true } } },
    });
    if (!subject) return { error: "Disciplina não encontrada." };
    await assertCanManageCourse(actor, subject.courseId);
    if (subject._count.curriculumEntries > 0) {
      return { error: "Remova a disciplina das matrizes antes de excluí-la." };
    }
    await prisma.subject.delete({ where: { id: subjectId } });
    revalidate(subject.courseId);
  } catch {
    return {
      error:
        "Não foi possível excluir — a disciplina tem matrículas registradas.",
    };
  }
}

/// Bulk import: all-or-nothing. Parse errors abort the import so the admin
/// fixes the paste instead of guessing which lines entered.
export async function importCurriculumEntries(
  courseId: string,
  curriculumId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const text = String(formData.get("text") ?? "");
  const { rows, errors } = parseCurriculumImport(text);

  if (errors.length > 0) {
    return { error: errors.slice(0, 5).join(" ") };
  }
  if (rows.length === 0) {
    return { error: "Nenhuma linha válida para importar." };
  }

  try {
    await assertCanManageCourse(actor, courseId);
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
      select: { courseId: true },
    });
    if (!curriculum || curriculum.courseId !== courseId) {
      return { error: "Matriz não pertence a este curso." };
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const subject = await tx.subject.upsert({
          where: { courseId_code: { courseId, code: row.code } },
          update: { name: row.name, workloadHours: row.workloadHours },
          create: {
            courseId,
            code: row.code,
            name: row.name,
            workloadHours: row.workloadHours,
          },
        });
        await tx.curriculumEntry.upsert({
          where: {
            curriculumId_subjectId: { curriculumId, subjectId: subject.id },
          },
          update: {
            period: row.period,
            isElective: row.isElective,
            electiveGroup: row.electiveGroup,
          },
          create: {
            curriculumId,
            subjectId: subject.id,
            period: row.period,
            isElective: row.isElective,
            electiveGroup: row.electiveGroup,
          },
        });
      }
    });
  } catch (e) {
    return fail(e, "Não foi possível importar as disciplinas.");
  }
  revalidate(courseId);
}
