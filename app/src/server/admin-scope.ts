// Shared scope helpers for the admin panel pages (Fase 4). Every course page
// loads through requireManageableCourse so the Fase 3 scope rules hold on all
// screens.
import { notFound } from "next/navigation";
import { type Actor, canManageCampus, canManageCourse } from "@/lib/authz";
import { requireAdmin } from "./actor";
import { prisma } from "./db";

export type ManageableCourse = {
  id: string;
  name: string;
  degree: "BACHELORS" | "LICENTIATE" | "TECHNOLOGY";
  campus: { id: string; code: string; name: string };
};

/// Courses the actor may manage, for lists and selects.
export async function getManageableCourses(
  actor: Actor,
): Promise<ManageableCourse[]> {
  const courses = await prisma.course.findMany({
    orderBy: [{ campus: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      degree: true,
      campusId: true,
      campus: { select: { id: true, code: true, name: true } },
    },
  });
  return courses
    .filter((c) => canManageCourse(actor, c))
    .map(({ campusId: _campusId, ...c }) => c);
}

/// Campuses where the actor may create courses (SUPER_ADMIN: all).
export async function getManageableCampuses(actor: Actor) {
  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, city: true, state: true },
  });
  return campuses.filter((c) => canManageCampus(actor, c.id));
}

/// Guard for /admin/cursos/[courseId] pages: 404 for unknown ids, redirect
/// out of scope attempts to /admin (never leaks other campuses' data).
export async function requireManageableCourse(courseId: string) {
  const actor = await requireAdmin();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      degree: true,
      campusId: true,
      campus: { select: { id: true, code: true, name: true } },
    },
  });
  if (!course || !canManageCourse(actor, course)) notFound();
  return { actor, course };
}
