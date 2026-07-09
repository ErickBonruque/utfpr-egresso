// Scope rules of Fase 3: an admin only reaches its own campus/course.
// These are the pure guards every protected page and server action uses.
import { describe, expect, it } from "vitest";
import {
  type Actor,
  canManageCampus,
  canManageCourse,
  canViewStudent,
  isAdmin,
  isSuperAdmin,
  primaryRole,
} from "../src/lib/authz";

const CAMPUS_A = "campus-a";
const CAMPUS_B = "campus-b";
const COURSE_A1 = { id: "course-a1", campusId: CAMPUS_A };
const COURSE_A2 = { id: "course-a2", campusId: CAMPUS_A };
const COURSE_B1 = { id: "course-b1", campusId: CAMPUS_B };

function actor(partial: Partial<Actor>): Actor {
  return { userId: "u1", grants: [], student: null, ...partial };
}

const superAdmin = actor({
  grants: [{ role: "SUPER_ADMIN", campusId: null, courseId: null }],
});
const campusAdminA = actor({
  grants: [{ role: "CAMPUS_ADMIN", campusId: CAMPUS_A, courseId: null }],
});
const courseAdminA1 = actor({
  grants: [{ role: "COURSE_ADMIN", campusId: null, courseId: COURSE_A1.id }],
});
const studentInfoA1 = {
  profileId: "sp-1",
  courseId: COURSE_A1.id,
  campusId: CAMPUS_A,
  isGraduate: false,
};
const studentA1 = actor({ student: studentInfoA1 });

describe("role resolution", () => {
  it("identifies admins and non-admins", () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(isAdmin(courseAdminA1)).toBe(true);
    expect(isAdmin(studentA1)).toBe(false);
  });

  it("derives the primary role, including ALUNO/EGRESSO from the profile", () => {
    expect(primaryRole(superAdmin)).toBe("SUPER_ADMIN");
    expect(primaryRole(campusAdminA)).toBe("CAMPUS_ADMIN");
    expect(primaryRole(courseAdminA1)).toBe("COURSE_ADMIN");
    expect(primaryRole(studentA1)).toBe("ALUNO");
    expect(
      primaryRole(
        actor({
          student: { ...studentInfoA1, isGraduate: true },
        }),
      ),
    ).toBe("EGRESSO");
    expect(primaryRole(actor({}))).toBeNull();
  });
});

describe("campus scope", () => {
  it("SUPER_ADMIN manages every campus", () => {
    expect(canManageCampus(superAdmin, CAMPUS_A)).toBe(true);
    expect(canManageCampus(superAdmin, CAMPUS_B)).toBe(true);
  });

  it("CAMPUS_ADMIN of A does not reach campus B", () => {
    expect(canManageCampus(campusAdminA, CAMPUS_A)).toBe(true);
    expect(canManageCampus(campusAdminA, CAMPUS_B)).toBe(false);
  });

  it("COURSE_ADMIN and students manage no campus", () => {
    expect(canManageCampus(courseAdminA1, CAMPUS_A)).toBe(false);
    expect(canManageCampus(studentA1, CAMPUS_A)).toBe(false);
  });
});

describe("course scope", () => {
  it("SUPER_ADMIN manages every course", () => {
    expect(canManageCourse(superAdmin, COURSE_A1)).toBe(true);
    expect(canManageCourse(superAdmin, COURSE_B1)).toBe(true);
  });

  it("CAMPUS_ADMIN manages only courses of its campus", () => {
    expect(canManageCourse(campusAdminA, COURSE_A1)).toBe(true);
    expect(canManageCourse(campusAdminA, COURSE_A2)).toBe(true);
    expect(canManageCourse(campusAdminA, COURSE_B1)).toBe(false);
  });

  it("COURSE_ADMIN manages only its own course", () => {
    expect(canManageCourse(courseAdminA1, COURSE_A1)).toBe(true);
    expect(canManageCourse(courseAdminA1, COURSE_A2)).toBe(false);
    expect(canManageCourse(courseAdminA1, COURSE_B1)).toBe(false);
  });

  it("students manage no course (privilege escalation blocked)", () => {
    expect(canManageCourse(studentA1, COURSE_A1)).toBe(false);
  });
});

describe("student visibility", () => {
  const target = { profileId: "sp-1", course: COURSE_A1 };

  it("a student sees itself but not other students", () => {
    expect(canViewStudent(studentA1, target)).toBe(true);
    expect(
      canViewStudent(studentA1, { profileId: "sp-2", course: COURSE_A1 }),
    ).toBe(false);
  });

  it("admins see students only inside their scope", () => {
    expect(canViewStudent(courseAdminA1, target)).toBe(true);
    expect(
      canViewStudent(courseAdminA1, { profileId: "sp-9", course: COURSE_B1 }),
    ).toBe(false);
    expect(
      canViewStudent(campusAdminA, { profileId: "sp-9", course: COURSE_B1 }),
    ).toBe(false);
    expect(
      canViewStudent(superAdmin, { profileId: "sp-9", course: COURSE_B1 }),
    ).toBe(true);
  });
});
