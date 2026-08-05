import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/server/actor";
import { getManageableCourses } from "@/server/admin-scope";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const actor = await requireAdmin();
  const courses = await getManageableCourses(actor);
  const courseIds = courses.map((c) => c.id);

  const [profiles, achievements, tracks, careers] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, graduateProfile: { select: { id: true } } },
    }),
    prisma.achievement.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _count: true,
    }),
    prisma.track.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _count: true,
    }),
    prisma.career.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _count: true,
    }),
  ]);

  const graduates = profiles.filter((p) => p.graduateProfile !== null).length;
  const students = profiles.length - graduates;
  const countBy = (rows: { courseId: string; _count: number }[]) =>
    new Map(rows.map((r) => [r.courseId, r._count]));
  const achievementsBy = countBy(achievements);
  const tracksBy = countBy(tracks);
  const careersBy = countBy(careers);

  const stats = [
    { label: "Alunos", value: students },
    { label: "Egressos", value: graduates },
    { label: "Cursos no escopo", value: courses.length },
    {
      label: "Conquistas configuradas",
      value: achievements.reduce((sum, r) => sum + r._count, 0),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral do seu escopo: alunos, egressos, cursos e conquistas
          configuradas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-lg">Por curso</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead className="text-right">Alunos</TableHead>
                <TableHead className="text-right">Egressos</TableHead>
                <TableHead className="text-right">Conquistas</TableHead>
                <TableHead className="text-right">Trilhas</TableHead>
                <TableHead className="text-right">Carreiras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => {
                const courseProfiles = profiles.filter(
                  (p) => p.courseId === c.id,
                );
                const courseGraduates = courseProfiles.filter(
                  (p) => p.graduateProfile !== null,
                ).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/cursos/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.campus.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {courseProfiles.length - courseGraduates}
                    </TableCell>
                    <TableCell className="text-right">
                      {courseGraduates}
                    </TableCell>
                    <TableCell className="text-right">
                      {achievementsBy.get(c.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {tracksBy.get(c.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {careersBy.get(c.id) ?? 0}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
