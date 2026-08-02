import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type Actor,
  type CourseRef,
  canManageCourse,
  isAdmin,
} from "@/lib/authz";
import { DomainError } from "@/lib/errors";
import { auth } from "./auth";
import { prisma } from "./db";

// Server-side bridge between the Better Auth session and the pure RBAC rules
// in src/lib/authz.ts. Every protected page/action goes through these helpers
// — the proxy only does an optimistic cookie check.

/// Loads the full Actor for the current session, or null when logged out.
export async function getActor(): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [grants, profile] = await Promise.all([
    prisma.adminAssignment.findMany({
      where: { userId: session.user.id },
      select: { role: true, campusId: true, courseId: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        courseId: true,
        course: { select: { campusId: true } },
        graduateProfile: { select: { id: true } },
      },
    }),
  ]);

  return {
    userId: session.user.id,
    grants,
    student: profile
      ? {
          profileId: profile.id,
          courseId: profile.courseId,
          campusId: profile.course.campusId,
          isGraduate: profile.graduateProfile !== null,
        }
      : null,
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  if (!isAdmin(actor)) redirect("/painel");
  return actor;
}

export async function requireStudent(): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.student) redirect(isAdmin(actor) ? "/admin" : "/login");
  return actor;
}

/// Loads a course and asserts the actor can manage it. Throwing (instead of
/// redirecting) makes privilege escalation attempts explicit in server actions.
export async function assertCanManageCourse(
  actor: Actor,
  courseId: string,
): Promise<CourseRef> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, campusId: true },
  });
  if (!course || !canManageCourse(actor, course)) {
    throw new DomainError("Sem permissão para gerenciar este curso.");
  }
  return course;
}
