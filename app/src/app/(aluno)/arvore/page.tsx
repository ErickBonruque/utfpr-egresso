import { Network } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getStudentProgress } from "@/server/student-progress";
import { TreeExplorer } from "./tree-explorer";

export const dynamic = "force-dynamic";

export default async function ArvorePage() {
  const progress = await getStudentProgress();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl">Árvore de carreiras</h1>
        <p className="text-muted-foreground">
          Sua jornada em {progress.course.name} — complete as disciplinas de
          cada nó para avançar.
        </p>
      </header>

      {progress.tracks.length === 0 ? (
        <EmptyState
          icon={Network}
          title="Nenhuma trilha configurada"
          description="A coordenação do curso ainda não montou a árvore de carreiras."
        />
      ) : (
        <TreeExplorer
          tracks={progress.tracks.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            nodes: t.nodes,
            // Map → Record: client components only take serializable props.
            details: Object.fromEntries(t.details),
          }))}
        />
      )}
    </>
  );
}
