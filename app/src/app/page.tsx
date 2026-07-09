import { prisma } from "@/server/db";

// Reads from Postgres on every request (no static prerender at build time,
// so CI can build without a database).
export const dynamic = "force-dynamic";

export default async function Home() {
  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
    include: {
      courses: {
        orderBy: { name: "asc" },
        include: { _count: { select: { subjects: true } } },
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-3xl">
            CEA — Conexão Egresso-Aluno
          </h1>
          <p className="text-neutral-500">
            Fundação do projeto (Fase 2). Os dados abaixo vêm do PostgreSQL, via
            Prisma, a partir do seed da Fase 1.
          </p>
        </div>
        <a
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white dark:bg-white dark:text-neutral-900"
        >
          Entrar
        </a>
      </header>

      {campuses.length === 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Nenhum campus encontrado — rode <code>npm run setup</code> para
          aplicar as migrations e o seed.
        </p>
      ) : (
        campuses.map((campus) => (
          <section key={campus.id} className="flex flex-col gap-3">
            <h2 className="font-medium text-xl">
              Campus {campus.name} ({campus.code})
            </h2>
            <ul className="flex flex-col gap-2">
              {campus.courses.map((course) => (
                <li
                  key={course.id}
                  className="flex items-baseline justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <span>{course.name}</span>
                  <span className="text-neutral-500 text-sm">
                    {course._count.subjects} disciplinas
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
