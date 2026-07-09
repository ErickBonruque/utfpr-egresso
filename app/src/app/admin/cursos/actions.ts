"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { canManageCampus } from "@/lib/authz";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

const DEGREES = ["BACHELORS", "LICENTIATE", "TECHNOLOGY"] as const;
type DegreeValue = (typeof DEGREES)[number];

function readDegree(formData: FormData): DegreeValue | null {
  const degree = String(formData.get("degree") ?? "");
  return (DEGREES as readonly string[]).includes(degree)
    ? (degree as DegreeValue)
    : null;
}

export async function createCourse(
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();

  const campusId = String(formData.get("campusId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const degree = readDegree(formData);

  if (!campusId || !name || !degree) {
    return { error: "Campus, nome e grau são obrigatórios." };
  }
  // Creating a course in a campus requires campus-level management
  // (SUPER_ADMIN or that campus' CAMPUS_ADMIN).
  if (!canManageCampus(actor, campusId)) {
    return { error: "Sem permissão para criar cursos neste campus." };
  }

  try {
    await prisma.course.create({ data: { campusId, name, degree } });
  } catch {
    return { error: `Já existe um curso "${name}" neste campus.` };
  }
  revalidatePath("/admin/cursos");
  revalidatePath("/admin");
}

export async function updateCourse(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const degree = readDegree(formData);
  if (!name || !degree) return { error: "Nome e grau são obrigatórios." };

  try {
    await assertCanManageCourse(actor, courseId);
    await prisma.course.update({
      where: { id: courseId },
      data: { name, degree },
    });
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível salvar o curso.",
    };
  }
  revalidatePath("/admin/cursos");
  revalidatePath("/admin");
}

export async function deleteCourse(
  courseId: string,
): Promise<FormActionResult> {
  const actor = await requireAdmin();

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, campusId: true },
    });
    if (!course) return { error: "Curso não encontrado." };
    // Deleting a whole course is campus-level management, not course-level:
    // a COURSE_ADMIN must not be able to delete its own course.
    if (!canManageCampus(actor, course.campusId)) {
      return { error: "Sem permissão para excluir cursos deste campus." };
    }

    const students = await prisma.studentProfile.count({
      where: { courseId },
    });
    if (students > 0) {
      return {
        error: `Este curso tem ${students} aluno(s)/egresso(s) — não pode ser excluído.`,
      };
    }
    // Content (subjects, achievements, tracks, careers) cascades by schema.
    await prisma.course.delete({ where: { id: courseId } });
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível excluir o curso.",
    };
  }
  revalidatePath("/admin/cursos");
  revalidatePath("/admin");
}
