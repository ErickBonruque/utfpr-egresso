"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof Error ? e.message : fallback };
}

function revalidate(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}/carreiras`);
}

async function requireCareer(careerId: string) {
  const actor = await requireAdmin();
  const career = await prisma.career.findUnique({ where: { id: careerId } });
  if (!career) throw new Error("Carreira não encontrada.");
  await assertCanManageCourse(actor, career.courseId);
  return career;
}

function readCareerForm(formData: FormData):
  | { error: string }
  | {
      data: { name: string; description: string | null };
      nodeIds: string[];
    } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const nodeIds = formData.getAll("nodeIds").map(String).filter(Boolean);
  if (!name) return { error: "Informe o nome da carreira." };
  return { data: { name, description }, nodeIds };
}

/// Careers may only reference nodes from tracks of the same course.
async function assertNodesInCourse(courseId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return;
  const count = await prisma.trackNode.count({
    where: { id: { in: nodeIds }, track: { courseId } },
  });
  if (count !== nodeIds.length) {
    throw new Error("Há nós de trilha fora deste curso na seleção.");
  }
}

export async function createCareer(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const parsed = readCareerForm(formData);
  if ("error" in parsed) return parsed;

  try {
    await assertCanManageCourse(actor, courseId);
    await assertNodesInCourse(courseId, parsed.nodeIds);
    await prisma.career.create({
      data: {
        courseId,
        ...parsed.data,
        nodes: { create: parsed.nodeIds.map((nodeId) => ({ nodeId })) },
      },
    });
    revalidate(courseId);
  } catch (e) {
    return fail(e, `Já existe uma carreira "${parsed.data.name}" neste curso.`);
  }
}

export async function updateCareer(
  careerId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const parsed = readCareerForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const career = await requireCareer(careerId);
    await assertNodesInCourse(career.courseId, parsed.nodeIds);
    await prisma.$transaction([
      prisma.career.update({ where: { id: careerId }, data: parsed.data }),
      prisma.careerTrackNode.deleteMany({ where: { careerId } }),
      prisma.careerTrackNode.createMany({
        data: parsed.nodeIds.map((nodeId) => ({ careerId, nodeId })),
      }),
    ]);
    revalidate(career.courseId);
  } catch (e) {
    return fail(e, "Não foi possível salvar a carreira.");
  }
}

export async function deleteCareer(
  careerId: string,
): Promise<FormActionResult> {
  try {
    const career = await requireCareer(careerId);
    await prisma.career.delete({ where: { id: careerId } });
    revalidate(career.courseId);
  } catch (e) {
    return fail(e, "Não foi possível excluir a carreira.");
  }
}
