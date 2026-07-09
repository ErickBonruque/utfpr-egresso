import Link from "next/link";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormDialog } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { requireManageableCourse } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import {
  createCurriculum,
  createSubjectInCurriculum,
  deleteCurriculum,
  deleteSubject,
  importCurriculumEntries,
  removeEntry,
  toggleCurriculumActive,
  updateEntry,
} from "./actions";
import { ImportDialog } from "./import-dialog";

export const dynamic = "force-dynamic";

function SubjectFields({
  defaults,
  lockCode = false,
}: {
  defaults?: {
    code: string;
    name: string;
    workloadHours: number;
    period: number;
    isElective: boolean;
    electiveGroup: string | null;
  };
  lockCode?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            name="code"
            placeholder="CC1AED1"
            defaultValue={defaults?.code}
            readOnly={lockCode}
            className={lockCode ? "bg-muted" : undefined}
            required
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workloadHours">Carga (h)</Label>
          <Input
            id="workloadHours"
            name="workloadHours"
            type="number"
            min={1}
            defaultValue={defaults?.workloadHours}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="period">Período</Label>
          <Input
            id="period"
            name="period"
            type="number"
            min={0}
            defaultValue={defaults?.period ?? 1}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="electiveGroup">Grupo eletiva</Label>
          <Input
            id="electiveGroup"
            name="electiveGroup"
            placeholder="412"
            defaultValue={defaults?.electiveGroup ?? ""}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isElective"
              className="accent-primary"
              defaultChecked={defaults?.isElective}
            />
            Eletiva
          </label>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Período 0 também marca a disciplina como eletiva.
      </p>
    </>
  );
}

export default async function CourseSubjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ matriz?: string }>;
}) {
  const { courseId } = await params;
  const { matriz } = await searchParams;
  await requireManageableCourse(courseId);

  const curricula = await prisma.curriculum.findMany({
    where: { courseId },
    orderBy: { version: "desc" },
    include: { _count: { select: { entries: true } } },
  });
  const selected =
    curricula.find((c) => c.version === matriz) ??
    curricula.find((c) => c.isActive) ??
    curricula[0];

  const entries = selected
    ? await prisma.curriculumEntry.findMany({
        where: { curriculumId: selected.id },
        orderBy: [{ period: "asc" }, { subject: { code: "asc" } }],
        include: { subject: true },
      })
    : [];

  const orphanSubjects = await prisma.subject.findMany({
    where: { courseId, curriculumEntries: { none: {} } },
    orderBy: { code: "asc" },
  });

  const periods = [...new Set(entries.map((e) => e.period))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {curricula.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cursos/${courseId}/disciplinas?matriz=${encodeURIComponent(c.version)}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                selected?.id === c.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              Matriz {c.version}
              {!c.isActive ? " (inativa)" : ""}
            </Link>
          ))}
          <FormDialog
            title="Nova matriz curricular"
            description="Crie a versão e use a importação em lote para preenchê-la."
            submitLabel="Criar matriz"
            action={createCurriculum.bind(null, courseId)}
            trigger={
              <Button variant="ghost" size="sm">
                + Nova matriz
              </Button>
            }
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="version">Versão</Label>
              <Input
                id="version"
                name="version"
                placeholder="2026/1"
                required
              />
            </div>
          </FormDialog>
        </div>

        {selected ? (
          <div className="flex flex-wrap gap-2">
            <ImportDialog
              action={importCurriculumEntries.bind(null, courseId, selected.id)}
              curriculumVersion={selected.version}
            />
            <FormDialog
              title={`Nova disciplina — matriz ${selected.version}`}
              submitLabel="Adicionar"
              action={createSubjectInCurriculum.bind(
                null,
                courseId,
                selected.id,
              )}
              trigger={<Button>Nova disciplina</Button>}
            >
              <SubjectFields />
            </FormDialog>
          </div>
        ) : null}
      </div>

      {selected ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {entries.length} disciplina(s) na matriz {selected.version}
              {selected.isActive ? "" : " — matriz inativa"}
            </p>
            <div className="flex gap-2">
              <ConfirmButton
                action={toggleCurriculumActive.bind(null, selected.id)}
                confirmMessage={`${selected.isActive ? "Desativar" : "Ativar"} a matriz ${selected.version}?`}
              >
                {selected.isActive ? "Desativar matriz" : "Ativar matriz"}
              </ConfirmButton>
              <ConfirmButton
                action={deleteCurriculum.bind(null, selected.id)}
                confirmMessage={`Excluir a matriz ${selected.version} com ${entries.length} disciplina(s)? As disciplinas em si não são apagadas do curso.`}
              >
                Excluir matriz
              </ConfirmButton>
            </div>
          </div>

          {periods.map((period) => (
            <section key={period} className="flex flex-col gap-2">
              <h2 className="font-medium text-sm">
                {period === 0 ? "Eletivas" : `${period}º período`}
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Carga</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries
                      .filter((e) => e.period === period)
                      .map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">
                            {entry.subject.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.subject.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.subject.workloadHours}h
                          </TableCell>
                          <TableCell>
                            {entry.isElective ? (
                              <Badge variant="outline">
                                Eletiva
                                {entry.electiveGroup
                                  ? ` · grupo ${entry.electiveGroup}`
                                  : ""}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Obrigatória</Badge>
                            )}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <FormDialog
                              title={`Editar ${entry.subject.code}`}
                              action={updateEntry.bind(null, entry.id)}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Editar
                                </Button>
                              }
                            >
                              <SubjectFields
                                lockCode
                                defaults={{
                                  code: entry.subject.code,
                                  name: entry.subject.name,
                                  workloadHours: entry.subject.workloadHours,
                                  period: entry.period,
                                  isElective: entry.isElective,
                                  electiveGroup: entry.electiveGroup,
                                }}
                              />
                            </FormDialog>
                            <ConfirmButton
                              action={removeEntry.bind(null, entry.id)}
                              confirmMessage={`Remover ${entry.subject.code} da matriz ${selected.version}? A disciplina continua existindo no curso.`}
                            >
                              Remover
                            </ConfirmButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhuma matriz curricular ainda — crie uma para começar.
        </p>
      )}

      {orphanSubjects.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-sm">Disciplinas fora de matrizes</h2>
          <p className="text-muted-foreground text-xs">
            Existem no curso mas não aparecem em nenhuma versão de matriz. Podem
            ser reaproveitadas criando a disciplina com o mesmo código, ou
            excluídas.
          </p>
          <div className="flex flex-wrap gap-2">
            {orphanSubjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
              >
                <span className="font-mono text-xs">{s.code}</span>
                <span>{s.name}</span>
                <ConfirmButton
                  action={deleteSubject.bind(null, s.id)}
                  confirmMessage={`Excluir ${s.code} — ${s.name} definitivamente? Requisitos de trilha que a citam serão removidos.`}
                  variant="ghost"
                >
                  Excluir
                </ConfirmButton>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
