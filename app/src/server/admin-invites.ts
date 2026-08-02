// Admin invite service (Fase 4). Invites carry a random token; the accept
// page creates the user + credential + AdminAssignment in one transaction.
// E-mail delivery is a placeholder (src/server/mailer.ts) — the panel shows
// the link for manual delivery. Future direction (Erick, 2026-07-09): the
// UTFPR integration may auto-grant admin to staff ("servidor") logins.

import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import {
  type Actor,
  type AdminRole,
  type CourseRef,
  canGrantAdmin,
  type GrantTarget,
  isSuperAdmin,
} from "@/lib/authz";
import { DomainError } from "@/lib/errors";
import {
  inviteExpiry,
  invitePath,
  inviteStatus,
  validateInviteEmail,
  validateInvitePassword,
} from "@/lib/invites";
import { prisma } from "./db";
import { sendMail } from "./mailer";

/// Resolves the campus of the target course so canGrantAdmin can check
/// CAMPUS_ADMIN scope; also validates that referenced scopes exist.
async function resolveTargetCourse(
  target: GrantTarget,
): Promise<CourseRef | null> {
  if (target.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: target.courseId },
      select: { id: true, campusId: true },
    });
    if (!course) throw new DomainError("Curso do convite não encontrado.");
    return course;
  }
  if (target.campusId) {
    const campus = await prisma.campus.findUnique({
      where: { id: target.campusId },
      select: { id: true },
    });
    if (!campus) throw new DomainError("Campus do convite não encontrado.");
  }
  return null;
}

async function assertCanGrant(actor: Actor, target: GrantTarget) {
  const targetCourse = await resolveTargetCourse(target);
  if (!canGrantAdmin(actor, target, targetCourse)) {
    throw new DomainError("Sem permissão para conceder este papel.");
  }
}

export type CreateInviteInput = {
  name: string;
  email: string;
  role: AdminRole;
  campusId: string | null;
  courseId: string | null;
};

export type CreateInviteResult =
  | { kind: "invited"; path: string }
  | { kind: "granted_existing_user" };

/// Creates an invite — or, when the e-mail already belongs to a user, grants
/// the role directly (no password to define, so no invite needed).
export async function createAdminInvite(
  actor: Actor,
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const email = validateInviteEmail(input.email);
  const name = input.name.trim();
  if (!name) throw new DomainError("Informe o nome do administrador.");

  const target: GrantTarget = {
    role: input.role,
    campusId: input.campusId,
    courseId: input.courseId,
  };
  await assertCanGrant(actor, target);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const already = await prisma.adminAssignment.findFirst({
      where: {
        userId: existingUser.id,
        role: target.role,
        campusId: target.campusId,
        courseId: target.courseId,
      },
    });
    if (already) throw new DomainError("Este usuário já possui esse papel.");
    await prisma.adminAssignment.create({
      data: {
        userId: existingUser.id,
        role: target.role,
        campusId: target.campusId,
        courseId: target.courseId,
      },
    });
    return { kind: "granted_existing_user" };
  }

  const pending = await prisma.adminInvite.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) {
    throw new DomainError(
      "Já existe um convite pendente para este e-mail — cancele-o antes de criar outro.",
    );
  }

  const token = randomBytes(32).toString("base64url");
  const invite = await prisma.adminInvite.create({
    data: {
      email,
      name,
      role: target.role,
      campusId: target.campusId,
      courseId: target.courseId,
      token,
      expiresAt: inviteExpiry(),
      createdById: actor.userId,
    },
  });

  // Placeholder delivery (no SMTP): logs and returns delivered=false; the
  // panel shows the copyable link either way.
  await sendMail({
    to: email,
    subject: "Convite para administrar o Sistema CEA",
    text: `Você foi convidado(a) para administrar o Sistema CEA. Acesse: ${invitePath(invite.token)}`,
  });

  return { kind: "invited", path: invitePath(invite.token) };
}

export async function getValidInvite(token: string) {
  const invite = await prisma.adminInvite.findUnique({
    where: { token },
    include: {
      createdBy: { select: { name: true } },
    },
  });
  if (!invite || inviteStatus(invite) !== "valid") return null;
  return invite;
}

/// Accepts an invite: creates the user with a credential account (same shape
/// the seed uses) and the AdminAssignment, atomically.
export async function acceptInvite(token: string, password: string) {
  validateInvitePassword(password);

  const invite = await getValidInvite(token);
  if (!invite)
    throw new DomainError("Convite inválido, expirado ou já utilizado.");

  const taken = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });
  if (taken) {
    throw new DomainError(
      "Já existe uma conta com este e-mail — faça login normalmente.",
    );
  }

  const hashed = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: invite.name, email: invite.email, emailVerified: true },
    });
    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    await tx.adminAssignment.create({
      data: {
        userId: user.id,
        role: invite.role,
        campusId: invite.campusId,
        courseId: invite.courseId,
      },
    });
    await tx.adminInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });
}

export async function cancelInvite(actor: Actor, inviteId: string) {
  const invite = await prisma.adminInvite.findUnique({
    where: { id: inviteId },
    select: { role: true, campusId: true, courseId: true },
  });
  if (!invite) throw new DomainError("Convite não encontrado.");
  await assertCanGrant(actor, invite);
  await prisma.adminInvite.delete({ where: { id: inviteId } });
}

/// Revokes an assignment under the same rule as granting, with two locks:
/// no self-revocation and never removing the last SUPER_ADMIN.
export async function revokeAdminAssignment(
  actor: Actor,
  assignmentId: string,
) {
  const assignment = await prisma.adminAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      userId: true,
      role: true,
      campusId: true,
      courseId: true,
    },
  });
  if (!assignment) throw new DomainError("Atribuição não encontrada.");
  if (assignment.userId === actor.userId) {
    throw new DomainError("Você não pode revogar o próprio papel.");
  }
  await assertCanGrant(actor, assignment);

  if (assignment.role === "SUPER_ADMIN") {
    if (!isSuperAdmin(actor)) {
      throw new DomainError("Sem permissão para revogar este papel.");
    }
    const supers = await prisma.adminAssignment.count({
      where: { role: "SUPER_ADMIN" },
    });
    if (supers <= 1) {
      throw new DomainError("Não é possível remover o último SUPER_ADMIN.");
    }
  }

  await prisma.adminAssignment.delete({ where: { id: assignment.id } });
}
