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
import { ACADEMIC_STATUS_LABEL } from "@/lib/labels";
import { requireAdmin } from "@/server/actor";
import { getManageableCourses } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import { graduateStudent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const actor = await requireAdmin();
  const courses = await getManageableCourses(actor);

  const students = await prisma.studentProfile.findMany({
    where: { courseId: { in: courses.map((c) => c.id) } },
    orderBy: [{ course: { name: "asc" } }, { user: { name: "asc" } }],
    include: {
      user: true,
      course: true,
      academicStanding: true,
      graduateProfile: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl">Alunos e egressos</h1>
        <p className="text-muted-foreground text-sm">
          {students.length} aluno(s) no seu escopo. “Marcar como formado(a)” é o
          fallback manual da transição aluno → egresso enquanto não há
          integração com a UTFPR — usa a mesma regra do sync.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>RA</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => {
              const status = s.academicStanding?.status;
              const graduated = s.graduateProfile !== null;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.user.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ra}</TableCell>
                  <TableCell>{s.course.name}</TableCell>
                  <TableCell>
                    {status ? (ACADEMIC_STATUS_LABEL[status] ?? status) : "—"}
                  </TableCell>
                  <TableCell>
                    {graduated ? (
                      <Badge variant="secondary">🎓 Egresso(a)</Badge>
                    ) : (
                      <ConfirmButton
                        action={graduateStudent.bind(null, s.id)}
                        confirmMessage={`Marcar ${s.user.name} como formado(a)? A transição cria o perfil de egresso e não é desfeita pelo painel.`}
                      >
                        Marcar como formado(a)
                      </ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
