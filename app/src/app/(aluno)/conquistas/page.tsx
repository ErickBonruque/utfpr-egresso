import { getStudentProgress } from "@/server/student-progress";
import { AchievementsGrid } from "./achievements-grid";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("pt-BR");

export default async function ConquistasPage() {
  const progress = await getStudentProgress();
  const unlocked = progress.achievements.filter(
    (a) => a.state === "unlocked",
  ).length;

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl">Conquistas</h1>
        <p className="text-muted-foreground">
          {unlocked} de {progress.achievements.length} desbloqueadas ·{" "}
          {nf.format(progress.xp.total)} XP acumulado
        </p>
      </header>

      <AchievementsGrid
        achievements={progress.achievements.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          icon: a.icon,
          xpReward: a.xpReward,
          state: a.state,
          progress: a.progress,
        }))}
      />
    </>
  );
}
