// Pure rules of the admin invite flow (Fase 4) — no I/O, unit-testable.
// The persistence side lives in src/server/admin-invites.ts.

export const INVITE_TTL_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 8;

export type InviteStatus = "valid" | "accepted" | "expired";

export function inviteStatus(
  invite: { acceptedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function inviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/// Path of the public accept page; the panel prepends window.location.origin.
export function invitePath(token: string): string {
  return `/convite/${token}`;
}

export function validateInviteEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("E-mail inválido.");
  }
  return normalized;
}

export function validateInvitePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
}
