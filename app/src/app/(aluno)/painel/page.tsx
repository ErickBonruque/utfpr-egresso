import { Trophy } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpBar } from "@/components/gamification/xp-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStudentProgress } from "@/server/student-progress";
import { CurriculumMap } from "./curriculum-map";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Cursando",
  LOCKED: "Matrícula trancada",
  DROPPED_OUT: "Desistente",
  GRADUATED: "Formado(a)",
};

const nf = new Intl.NumberFormat("pt-BR");

export default async function PainelPage() {
  const progress = await getStudentProgress();
  const { profile, course, standing, workload, xp } = progress;

  const recent = progress.achievements
    .filter((a) => a.state === "unlocked")
    .sort(
      (a, b) => (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0),
    )
    .slice(0, 4);
  const upcoming = progress.achievements
    .filter((a) => a.state === "in-progress")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl">Olá, {profile.name}</h1>
        <p className="text-muted-foreground">
          {course.name} · Campus {course.campusName}
        </p>
      </header>

      {profile.isGraduate && (
        <p className="rounded-lg border border-success/50 bg-success/10 p-4 text-sm text-success">
          🎓 Você concluiu o curso! O espaço do egresso (vitrine, mentoria e
          conexões) chega na Fase 7.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso no curso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {standing.status
                  ? (STATUS_LABEL[standing.status] ?? standing.status)
                  : "Sem dados acadêmicos"}
              </Badge>
              {standing.currentPeriod && (
                <Badge variant="outline">
                  {standing.currentPeriod}º período
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Progress
                value={workload.pct}
                aria-label="Carga horária concluída"
                className="h-2 [&>[data-slot=progress-indicator]]:bg-brand"
              />
              <p className="text-muted-foreground text-xs tabular-nums">
                {nf.format(workload.approvedHours)}h de{" "}
                {nf.format(workload.totalHours)}h obrigatórias · {workload.pct}%
              </p>
            </div>
            {standing.gpa !== null && (
              <p className="text-muted-foreground text-sm tabular-nums">
                Coeficiente de rendimento: {standing.gpa.toFixed(1)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nível &amp; XP</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <LevelBadge
              level={xp.level.level}
              title={xp.level.title}
              className="self-start"
            />
            <XpBar
              totalXp={xp.total}
              levelMinXp={xp.level.minXp}
              nextLevelMinXp={xp.level.nextMinXp}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas conquistas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma conquista em andamento — explore a{" "}
                <Link href="/arvore" className="underline">
                  árvore de carreiras
                </Link>
                .
              </p>
            ) : (
              upcoming.map((a) => (
                <div key={a.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-sm">{a.name}</p>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {a.progress}%
                    </span>
                  </div>
                  <Progress
                    value={a.progress}
                    aria-label={`Progresso de ${a.name}`}
                    className="h-1.5 [&>[data-slot=progress-indicator]]:bg-brand"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-xl">Conquistas recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/conquistas">Ver todas →</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhuma conquista ainda"
            description="Complete disciplinas para desbloquear as primeiras."
            action={
              <Button asChild size="sm">
                <Link href="/arvore">Ver árvore de carreiras</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((a) => (
              <AchievementCard
                key={a.id}
                name={a.name}
                description={a.description}
                icon={a.icon}
                xp={a.xpReward}
                category={a.category}
                state="unlocked"
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl">Mapa curricular</h2>
        <CurriculumMap periods={progress.curriculum} />
      </section>
    </>
  );
}
