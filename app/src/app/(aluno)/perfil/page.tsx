import { LevelBadge } from "@/components/gamification/level-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentProgress } from "@/server/student-progress";
import { updateStudentProfile } from "./actions";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("pt-BR");

const ENROLLMENT_STATUS: Record<string, { label: string; className: string }> =
  {
    APPROVED: { label: "Aprovada", className: "text-success" },
    IN_PROGRESS: { label: "Cursando", className: "" },
    FAILED: { label: "Reprovada", className: "text-destructive" },
    WITHDRAWN: { label: "Trancada", className: "text-muted-foreground" },
  };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default async function PerfilPage() {
  const progress = await getStudentProgress();
  const { profile, course, standing, workload, xp } = progress;
  const unlocked = progress.achievements.filter(
    (a) => a.state === "unlocked",
  ).length;

  const stats: { label: string; value: string }[] = [
    { label: "XP total", value: nf.format(xp.total) },
    {
      label: "Conquistas",
      value: `${unlocked} / ${progress.achievements.length}`,
    },
    { label: "Carga horária concluída", value: `${workload.pct}%` },
    {
      label: "Coeficiente de rendimento",
      value: standing.gpa === null ? "—" : standing.gpa.toFixed(1),
    },
    {
      label: "Período atual",
      value: standing.currentPeriod ? `${standing.currentPeriod}º` : "—",
    },
    { label: "Ingresso", value: profile.admissionTerm ?? "—" },
  ];

  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-brand font-heading font-semibold text-brand-foreground text-lg">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl">{profile.name}</h1>
          <p className="text-muted-foreground text-sm">
            RA {profile.ra} · {course.name} · Campus {course.campusName}
          </p>
        </div>
        <LevelBadge
          level={xp.level.level}
          title={xp.level.title}
          className="ml-auto"
        />
      </header>

      <Tabs defaultValue="visao-geral" className="gap-6">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardHeader>
                  <CardTitle className="font-normal text-muted-foreground text-sm">
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading font-semibold text-2xl tabular-nums">
                    {s.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="flex flex-col gap-6">
          {progress.history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem matrículas registradas ainda.
            </p>
          ) : (
            progress.history.map((term) => (
              <div key={term.term} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-lg">
                  {term.term}
                  <Badge variant="outline">
                    {term.entries.length} disciplina(s)
                  </Badge>
                </h2>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                        <TableHead className="text-right">Freq.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {term.entries.map((e) => {
                        const status = ENROLLMENT_STATUS[e.status] ?? {
                          label: e.status,
                          className: "",
                        };
                        return (
                          <TableRow key={`${e.code}-${e.status}`}>
                            <TableCell className="font-mono text-xs">
                              {e.code}
                            </TableCell>
                            <TableCell>{e.name}</TableCell>
                            <TableCell className={status.className}>
                              {status.label}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {e.grade === null ? "—" : e.grade.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {e.attendance === null
                                ? "—"
                                : `${Math.round(e.attendance)}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
          <p className="text-muted-foreground text-xs">
            Dados acadêmicos são espelho da UTFPR (mock determinístico até a
            integração da Fase 8) — não são editáveis aqui.
          </p>
        </TabsContent>

        <TabsContent value="configuracoes">
          <ProfileForm
            action={updateStudentProfile}
            defaults={{
              bio: profile.bio,
              linkedinUrl: profile.linkedinUrl,
              githubUrl: profile.githubUrl,
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
