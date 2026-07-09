import { SignOutButton } from "@/components/sign-out-button";
import { canManageCourse, primaryRole } from "@/lib/authz";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { graduateStudent } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Administração geral",
  CAMPUS_ADMIN: "Administração de campus",
  COURSE_ADMIN: "Coordenação de curso",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Cursando",
  LOCKED: "Trancado",
  DROPPED_OUT: "Desistente",
  GRADUATED: "Formado(a)",
};

export default async function AdminPage() {
  const actor = await requireAdmin();
  const role = primaryRole(actor);

  // Scope filter (Fase 3 rule): only students of manageable courses appear.
  const courses = await prisma.course.findMany({
    select: { id: true, campusId: true },
  });
  const manageableCourseIds = courses
    .filter((c) => canManageCourse(actor, c))
    .map((c) => c.id);

  const students = await prisma.studentProfile.findMany({
    where: { courseId: { in: manageableCourseIds } },
    orderBy: [{ course: { name: "asc" } }, { user: { name: "asc" } }],
    include: {
      user: true,
      course: true,
      academicStanding: true,
      graduateProfile: true,
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-3xl">Painel administrativo</h1>
          <p className="text-neutral-500">
            {role ? (ROLE_LABEL[role] ?? role) : ""} · {students.length}{" "}
            aluno(s) no seu escopo
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-xl">Alunos e egressos</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="border-neutral-200 border-b text-left text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">RA</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const status = s.academicStanding?.status;
                const graduated = s.graduateProfile !== null;
                return (
                  <tr
                    key={s.id}
                    className="border-neutral-100 border-b last:border-0 dark:border-neutral-900"
                  >
                    <td className="px-4 py-3">{s.user.name}</td>
                    <td className="px-4 py-3">{s.ra}</td>
                    <td className="px-4 py-3">{s.course.name}</td>
                    <td className="px-4 py-3">
                      {status ? (STATUS_LABEL[status] ?? status) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {graduated ? (
                        <span className="text-neutral-400">🎓 Egresso(a)</span>
                      ) : (
                        <form action={graduateStudent}>
                          <input
                            type="hidden"
                            name="studentProfileId"
                            value={s.id}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                          >
                            Marcar como formado(a)
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-neutral-500 text-xs">
          “Marcar como formado(a)” é o fallback manual da transição aluno →
          egresso enquanto não há integração com a UTFPR — usa a mesma regra do
          sync. A gestão completa (campi, cursos, conquistas, trilhas) chega na
          Fase 4.
        </p>
      </section>
    </main>
  );
}
