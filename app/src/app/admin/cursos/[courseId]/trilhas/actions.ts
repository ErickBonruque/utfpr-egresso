"use server";

import { revalidatePath } from "next/cache";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { assertCanManageCourse, requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof Error ? e.message : fallback };
}

function revalidate(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}/trilhas`);
}

async function requireTrack(trackId: string) {
  const actor = await requireAdmin();
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) throw new Error("Trilha não encontrada.");
  await assertCanManageCourse(actor, track.courseId);
  return track;
}

async function requireNode(nodeId: string) {
  const actor = await requireAdmin();
  const node = await prisma.trackNode.findUnique({
    where: { id: nodeId },
    include: { track: { select: { id: true, courseId: true } } },
  });
  if (!node) throw new Error("Nó não encontrado.");
  await assertCanManageCourse(actor, node.track.courseId);
  return node;
}

export async function createTrack(
  courseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return { error: "Informe o nome da trilha." };

  try {
    await assertCanManageCourse(actor, courseId);
    await prisma.track.create({ data: { courseId, name, description } });
    revalidate(courseId);
  } catch (e) {
    return fail(e, `Já existe uma trilha "${name}" neste curso.`);
  }
}

export async function updateTrack(
  trackId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return { error: "Informe o nome da trilha." };

  try {
    const track = await requireTrack(trackId);
    await prisma.track.update({
      where: { id: trackId },
      data: { name, description },
    });
    revalidate(track.courseId);
  } catch (e) {
    return fail(e, "Não foi possível salvar a trilha.");
  }
}

export async function deleteTrack(trackId: string): Promise<FormActionResult> {
  try {
    const track = await requireTrack(trackId);
    await prisma.track.delete({ where: { id: trackId } });
    revalidate(track.courseId);
  } catch (e) {
    return fail(e, "Não foi possível excluir a trilha.");
  }
}

type NodeFormData = {
  name: string;
  description: string | null;
  icon: string | null;
  kind: "CORE" | "BRANCH";
  parentId: string | null;
  sortOrder: number;
  xpReward: number;
};

function readNodeForm(
  formData: FormData,
): { error: string } | { data: NodeFormData; subjectCodes: string[] } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const xpReward = Number(formData.get("xpReward") ?? 0);
  const subjectCodes = formData
    .getAll("subjectCodes")
    .map(String)
    .filter(Boolean);

  if (!name) return { error: "Informe o nome do nó." };
  if (kind !== "CORE" && kind !== "BRANCH") return { error: "Tipo inválido." };
  if (!Number.isInteger(sortOrder)) return { error: "Ordem inválida." };
  if (!Number.isInteger(xpReward) || xpReward < 0) {
    return { error: "XP deve ser um inteiro maior ou igual a 0." };
  }
  return {
    data: {
      name,
      description,
      icon,
      kind: kind as "CORE" | "BRANCH",
      parentId,
      sortOrder,
      xpReward,
    },
    subjectCodes,
  };
}

/// Maps requirement subject codes to ids, rejecting codes outside the course.
async function resolveRequirementIds(courseId: string, codes: string[]) {
  const subjects = await prisma.subject.findMany({
    where: { courseId, code: { in: codes } },
    select: { id: true, code: true },
  });
  const found = new Set(subjects.map((s) => s.code));
  const missing = codes.filter((c) => !found.has(c));
  if (missing.length > 0) {
    throw new Error(`Disciplinas fora do curso: ${missing.join(", ")}.`);
  }
  return subjects.map((s) => s.id);
}

export async function createNode(
  trackId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const parsed = readNodeForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const track = await requireTrack(trackId);
    if (parsed.data.parentId) {
      const parent = await prisma.trackNode.findUnique({
        where: { id: parsed.data.parentId },
        select: { trackId: true },
      });
      if (!parent || parent.trackId !== trackId) {
        return { error: "Nó pai inválido." };
      }
    }
    const subjectIds = await resolveRequirementIds(
      track.courseId,
      parsed.subjectCodes,
    );
    await prisma.trackNode.create({
      data: {
        trackId,
        ...parsed.data,
        requirements: {
          create: subjectIds.map((subjectId) => ({ subjectId })),
        },
      },
    });
    revalidate(track.courseId);
  } catch (e) {
    return fail(e, "Não foi possível criar o nó.");
  }
}

export async function updateNode(
  nodeId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const parsed = readNodeForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const node = await requireNode(nodeId);
    const { parentId } = parsed.data;
    if (parentId) {
      if (parentId === nodeId)
        return { error: "Um nó não pode ser o próprio pai." };
      const parent = await prisma.trackNode.findUnique({
        where: { id: parentId },
        select: { trackId: true },
      });
      if (!parent || parent.trackId !== node.trackId) {
        return { error: "Nó pai inválido." };
      }
      // Reparenting to a descendant would detach the subtree into a cycle.
      const nodes = await prisma.trackNode.findMany({
        where: { trackId: node.trackId },
        select: { id: true, parentId: true },
      });
      const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
      for (
        let cursor: string | null = parentId;
        cursor;
        cursor = parentOf.get(cursor) ?? null
      ) {
        if (cursor === nodeId) {
          return {
            error: "O nó pai não pode ser um descendente do próprio nó.",
          };
        }
      }
    }

    const subjectIds = await resolveRequirementIds(
      node.track.courseId,
      parsed.subjectCodes,
    );
    await prisma.$transaction([
      prisma.trackNode.update({ where: { id: nodeId }, data: parsed.data }),
      prisma.trackNodeRequirement.deleteMany({ where: { nodeId } }),
      prisma.trackNodeRequirement.createMany({
        data: subjectIds.map((subjectId) => ({ nodeId, subjectId })),
      }),
    ]);
    revalidate(node.track.courseId);
  } catch (e) {
    return fail(e, "Não foi possível salvar o nó.");
  }
}

export async function deleteNode(nodeId: string): Promise<FormActionResult> {
  try {
    const node = await requireNode(nodeId);
    // Children cascade by schema (TrackNodeTree onDelete: Cascade).
    await prisma.trackNode.delete({ where: { id: nodeId } });
    revalidate(node.track.courseId);
  } catch (e) {
    return fail(e, "Não foi possível excluir o nó.");
  }
}
