// Pure RBAC rules (Fase 3) — no I/O, fully unit-testable.
//
// Permission matrix (papel × recurso):
//   SUPER_ADMIN   → everything, every campus/course
//   CAMPUS_ADMIN  → its campus and every course inside it
//   COURSE_ADMIN  → its course only
//   ALUNO/EGRESSO → own profile only (derived from StudentProfile, not an
//                   AdminAssignment row; EGRESSO = has GraduateProfile)
//
// Scope columns follow the AdminAssignment convention from Fase 1:
// SUPER_ADMIN has both scopes null, CAMPUS_ADMIN sets campusId,
// COURSE_ADMIN sets courseId.

export type AdminRole = "SUPER_ADMIN" | "CAMPUS_ADMIN" | "COURSE_ADMIN";

export type AdminGrant = {
  role: AdminRole;
  campusId: string | null;
  courseId: string | null;
};

export type StudentInfo = {
  profileId: string;
  courseId: string;
  campusId: string;
  isGraduate: boolean;
};

/// Everything the guards need to know about the logged-in user.
export type Actor = {
  userId: string;
  grants: AdminGrant[];
  student: StudentInfo | null;
};

export type Role = AdminRole | "ALUNO" | "EGRESSO";

/// Course scope target: checks need the campus to honor CAMPUS_ADMIN grants.
export type CourseRef = { id: string; campusId: string };

export function isSuperAdmin(actor: Actor): boolean {
  return actor.grants.some((g) => g.role === "SUPER_ADMIN");
}

export function isAdmin(actor: Actor): boolean {
  return actor.grants.length > 0;
}

/// Highest-privilege role, used for post-login routing and display.
export function primaryRole(actor: Actor): Role | null {
  const order: AdminRole[] = ["SUPER_ADMIN", "CAMPUS_ADMIN", "COURSE_ADMIN"];
  for (const role of order) {
    if (actor.grants.some((g) => g.role === role)) return role;
  }
  if (actor.student) return actor.student.isGraduate ? "EGRESSO" : "ALUNO";
  return null;
}

export function canManageCampus(actor: Actor, campusId: string): boolean {
  return actor.grants.some(
    (g) =>
      g.role === "SUPER_ADMIN" ||
      (g.role === "CAMPUS_ADMIN" && g.campusId === campusId),
  );
}

export function canManageCourse(actor: Actor, course: CourseRef): boolean {
  return actor.grants.some(
    (g) =>
      g.role === "SUPER_ADMIN" ||
      (g.role === "CAMPUS_ADMIN" && g.campusId === course.campusId) ||
      (g.role === "COURSE_ADMIN" && g.courseId === course.id),
  );
}

/// Scope shape convention from Fase 1: SUPER_ADMIN has both ids null,
/// CAMPUS_ADMIN only campusId, COURSE_ADMIN only courseId.
export type GrantTarget = {
  role: AdminRole;
  campusId: string | null;
  courseId: string | null;
};

export function isValidGrantShape(target: GrantTarget): boolean {
  switch (target.role) {
    case "SUPER_ADMIN":
      return target.campusId === null && target.courseId === null;
    case "CAMPUS_ADMIN":
      return target.campusId !== null && target.courseId === null;
    case "COURSE_ADMIN":
      return target.campusId === null && target.courseId !== null;
  }
}

/// Who may grant (and symmetrically revoke/cancel) an admin role (Fase 4):
/// SUPER_ADMIN grants anything; CAMPUS_ADMIN grants COURSE_ADMIN for courses
/// of its campus (targetCourse resolves the course's campus). COURSE_ADMIN
/// grants nothing.
export function canGrantAdmin(
  actor: Actor,
  target: GrantTarget,
  targetCourse: CourseRef | null = null,
): boolean {
  if (!isValidGrantShape(target)) return false;
  if (isSuperAdmin(actor)) return true;
  if (target.role !== "COURSE_ADMIN" || !targetCourse) return false;
  if (target.courseId !== targetCourse.id) return false;
  return actor.grants.some(
    (g) => g.role === "CAMPUS_ADMIN" && g.campusId === targetCourse.campusId,
  );
}

/// A student may read their own data; admins may read students in scope.
export function canViewStudent(
  actor: Actor,
  student: { profileId: string; course: CourseRef },
): boolean {
  if (actor.student?.profileId === student.profileId) return true;
  return canManageCourse(actor, student.course);
}
