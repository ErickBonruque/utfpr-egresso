import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UtfprLogo } from "@/components/utfpr-logo";
import { isSuperAdmin, primaryRole } from "@/lib/authz";
import { ROLE_LABEL } from "@/lib/labels";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireAdmin();
  const role = primaryRole(actor);
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { name: true },
  });

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard" },
    ...(isSuperAdmin(actor) ? [{ href: "/admin/campi", label: "Campi" }] : []),
    { href: "/admin/cursos", label: "Cursos" },
    { href: "/admin/alunos", label: "Alunos" },
    { href: "/admin/sincronizacao", label: "Sincronização" },
    // COURSE_ADMIN cannot grant roles (Fase 3 matrix) — hide the section.
    ...(actor.grants.some((g) => g.role !== "COURSE_ADMIN")
      ? [{ href: "/admin/administradores", label: "Administradores" }]
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <UtfprLogo className="h-7" />
          <span className="h-9 w-px bg-border" aria-hidden />
          <div className="flex flex-col">
            <p className="font-semibold text-lg">Sistema CEA · Administração</p>
            <p className="text-muted-foreground text-sm">
              {user?.name}
              {role ? ` · ${ROLE_LABEL[role] ?? role}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="shrink-0 md:w-48">
          <AdminNav items={items} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
