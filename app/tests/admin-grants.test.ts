// Fase 4: who may grant/revoke admin roles, and invite lifecycle rules.
import { describe, expect, it } from "vitest";
import { type Actor, canGrantAdmin, isValidGrantShape } from "../src/lib/authz";
import { inviteExpiry, invitePath, inviteStatus } from "../src/lib/invites";

const CAMPUS_A = "campus-a";
const CAMPUS_B = "campus-b";
const COURSE_A1 = { id: "course-a1", campusId: CAMPUS_A };
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
const student = actor({
  student: {
    profileId: "sp1",
    courseId: COURSE_A1.id,
    campusId: CAMPUS_A,
    isGraduate: false,
  },
});

describe("isValidGrantShape", () => {
  it("enforces the Fase 1 scope convention per role", () => {
    expect(
      isValidGrantShape({
        role: "SUPER_ADMIN",
        campusId: null,
        courseId: null,
      }),
    ).toBe(true);
    expect(
      isValidGrantShape({
        role: "SUPER_ADMIN",
        campusId: CAMPUS_A,
        courseId: null,
      }),
    ).toBe(false);
    expect(
      isValidGrantShape({
        role: "CAMPUS_ADMIN",
        campusId: CAMPUS_A,
        courseId: null,
      }),
    ).toBe(true);
    expect(
      isValidGrantShape({
        role: "CAMPUS_ADMIN",
        campusId: null,
        courseId: null,
      }),
    ).toBe(false);
    expect(
      isValidGrantShape({
        role: "COURSE_ADMIN",
        campusId: null,
        courseId: COURSE_A1.id,
      }),
    ).toBe(true);
    expect(
      isValidGrantShape({
        role: "COURSE_ADMIN",
        campusId: CAMPUS_A,
        courseId: COURSE_A1.id,
      }),
    ).toBe(false);
  });
});

describe("canGrantAdmin", () => {
  it("SUPER_ADMIN grants any well-formed role", () => {
    expect(
      canGrantAdmin(superAdmin, {
        role: "SUPER_ADMIN",
        campusId: null,
        courseId: null,
      }),
    ).toBe(true);
    expect(
      canGrantAdmin(superAdmin, {
        role: "CAMPUS_ADMIN",
        campusId: CAMPUS_B,
        courseId: null,
      }),
    ).toBe(true);
    expect(
      canGrantAdmin(
        superAdmin,
        { role: "COURSE_ADMIN", campusId: null, courseId: COURSE_B1.id },
        COURSE_B1,
      ),
    ).toBe(true);
  });

  it("SUPER_ADMIN cannot grant a malformed scope", () => {
    expect(
      canGrantAdmin(superAdmin, {
        role: "COURSE_ADMIN",
        campusId: CAMPUS_A,
        courseId: COURSE_A1.id,
      }),
    ).toBe(false);
  });

  it("CAMPUS_ADMIN grants COURSE_ADMIN only inside its campus", () => {
    expect(
      canGrantAdmin(
        campusAdminA,
        { role: "COURSE_ADMIN", campusId: null, courseId: COURSE_A1.id },
        COURSE_A1,
      ),
    ).toBe(true);
    expect(
      canGrantAdmin(
        campusAdminA,
        { role: "COURSE_ADMIN", campusId: null, courseId: COURSE_B1.id },
        COURSE_B1,
      ),
    ).toBe(false);
  });

  it("CAMPUS_ADMIN cannot grant campus or global roles", () => {
    expect(
      canGrantAdmin(campusAdminA, {
        role: "CAMPUS_ADMIN",
        campusId: CAMPUS_A,
        courseId: null,
      }),
    ).toBe(false);
    expect(
      canGrantAdmin(campusAdminA, {
        role: "SUPER_ADMIN",
        campusId: null,
        courseId: null,
      }),
    ).toBe(false);
  });

  it("target course must match the granted courseId", () => {
    // Forged input: courseId of B1 but resolved course A1.
    expect(
      canGrantAdmin(
        campusAdminA,
        { role: "COURSE_ADMIN", campusId: null, courseId: COURSE_B1.id },
        COURSE_A1,
      ),
    ).toBe(false);
  });

  it("COURSE_ADMIN and students grant nothing", () => {
    for (const who of [courseAdminA1, student]) {
      expect(
        canGrantAdmin(
          who,
          { role: "COURSE_ADMIN", campusId: null, courseId: COURSE_A1.id },
          COURSE_A1,
        ),
      ).toBe(false);
    }
  });
});

describe("invite lifecycle", () => {
  const now = new Date("2026-07-09T12:00:00Z");

  it("valid until expiry, then expired; accepted wins over expiry", () => {
    const future = new Date("2026-07-10T12:00:00Z");
    const past = new Date("2026-07-08T12:00:00Z");
    expect(inviteStatus({ acceptedAt: null, expiresAt: future }, now)).toBe(
      "valid",
    );
    expect(inviteStatus({ acceptedAt: null, expiresAt: past }, now)).toBe(
      "expired",
    );
    expect(inviteStatus({ acceptedAt: past, expiresAt: past }, now)).toBe(
      "accepted",
    );
    expect(inviteStatus({ acceptedAt: null, expiresAt: now }, now)).toBe(
      "expired",
    );
  });

  it("expiry is 7 days ahead and the path targets /convite", () => {
    expect(inviteExpiry(now).getTime() - now.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(invitePath("abc123")).toBe("/convite/abc123");
  });
});
