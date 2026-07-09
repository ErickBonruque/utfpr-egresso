import { redirect } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminRole, canGrantAdmin, isSuperAdmin } from "@/lib/authz";
import { invitePath, inviteStatus } from "@/lib/invites";
import { ROLE_LABEL } from "@/lib/labels";
import { requireAdmin } from "@/server/actor";
import { getManageableCourses } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import {
  cancelInviteAction,
  inviteAdmin,
  revokeAssignmentAction,
} from "./actions";
import { CopyLinkButton } from "./copy-link-button";
import { InviteDialog } from "./invite-dialog";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await requireAdmin();
  // COURSE_ADMIN cannot grant roles (Fase 3 matrix) — nothing to see here.
  if (!actor.grants.some((g) => g.role !== "COURSE_ADMIN")) redirect("/admin");

  const [assignments, invites, campuses, courses] = await Promise.all([
    prisma.adminAssignment.findMany({
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.adminInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campus.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    getManageableCourses(actor),
  ]);

  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const courseById = new Map(
    (
      await prisma.course.findMany({
        select: { id: true, name: true, campusId: true },
      })
    ).map((c) => [c.id, c]),
  );

  const courseRefOf = (courseId: string | null) => {
    if (!courseId) return null;
    const course = courseById.get(courseId);
    return course ? { id: course.id, campusId: course.campusId } : null;
  };
  const scopeLabel = (target: {
    role: AdminRole;
    campusId: string | null;
    courseId: string | null;
  }) => {
    if (target.campusId) {
      return campusById.get(target.campusId)?.name ?? "Campus removido";
    }
    if (target.courseId) {
      return courseById.get(target.courseId)?.name ?? "Curso removido";
    }
    return "Global";
  };

  // Scope filter: show only what the actor could grant (plus own roles).
  const visibleAssignments = assignments.filter(
    (a) =>
      a.userId === actor.userId ||
      canGrantAdmin(actor, a, courseRefOf(a.courseId)),
  );
  const visibleInvites = invites.filter((i) =>
    canGrantAdmin(actor, i, courseRefOf(i.courseId)),
  );

  const allowedRoles: AdminRole[] = isSuperAdmin(actor)
    ? ["SUPER_ADMIN", "CAMPUS_ADMIN", "COURSE_ADMIN"]
    : ["COURSE_ADMIN"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Administradores</h1>
          <p className="text-muted-foreground text-sm">
            Quando a integração com a UTFPR existir, logins de servidores
            poderão receber papel de administrador automaticamente — por ora o
            acesso é concedido por convite.
          </p>
        </div>
        <InviteDialog
          action={inviteAdmin}
          allowedRoles={allowedRoles}
          campuses={campuses}
          courses={courses.map((c) => ({
            id: c.id,
            name: c.name,
            campusCode: c.campus.code,
          }))}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-lg">Papéis ativos</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAssignments.map((assignment) => {
                const own = assignment.userId === actor.userId;
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.user.name}
                      {own ? (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          (você)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{assignment.user.email}</TableCell>
                    <TableCell>{ROLE_LABEL[assignment.role]}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{scopeLabel(assignment)}</Badge>
                    </TableCell>
                    <TableCell>
                      {!own &&
                      canGrantAdmin(
                        actor,
                        assignment,
                        courseRefOf(assignment.courseId),
                      ) ? (
                        <ConfirmButton
                          action={revokeAssignmentAction.bind(
                            null,
                            assignment.id,
                          )}
                          confirmMessage={`Revogar o papel de ${assignment.user.name}? A conta continua existindo, mas perde o acesso administrativo deste papel.`}
                        >
                          Revogar
                        </ConfirmButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-lg">Convites pendentes</h2>
        {visibleInvites.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum convite pendente.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleInvites.map((invite) => {
                  const expired = inviteStatus(invite) === "expired";
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">
                        {invite.name}
                      </TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>{ROLE_LABEL[invite.role]}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scopeLabel(invite)}</Badge>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : (
                          invite.expiresAt.toLocaleDateString("pt-BR")
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {!expired ? (
                          <CopyLinkButton path={invitePath(invite.token)} />
                        ) : null}
                        <ConfirmButton
                          action={cancelInviteAction.bind(null, invite.id)}
                          confirmMessage={`Cancelar o convite de ${invite.name}? O link deixa de funcionar.`}
                        >
                          Cancelar
                        </ConfirmButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
