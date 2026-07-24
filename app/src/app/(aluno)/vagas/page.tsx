import { getStudentProgress } from "@/server/student-progress";
import { JobsSearch } from "./jobs-search";

export const dynamic = "force-dynamic";

// Vagas (Fase 6.1): recria a busca de empregos da POC no portal do aluno.
// A fonte (Adzuna) fica isolada em src/server/jobs.ts — trocável sem mexer
// aqui. Decisão do Erick em 2026-07-24; ver .planning/decisions/FASE_6_1_VAGAS.md.
export default async function VagasPage() {
  const progress = await getStudentProgress();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl">Vagas de emprego</h1>
        <p className="text-muted-foreground">
          Busque oportunidades reais para a sua área de{" "}
          <span className="font-medium text-foreground">
            {progress.course.name}
          </span>
          .
        </p>
      </header>

      <JobsSearch />
    </>
  );
}
