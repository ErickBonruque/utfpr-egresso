import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormDialog } from "@/components/admin/form-dialog";
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
import { requireManageableCourse } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import { createLevel, deleteLevel, updateLevel } from "./actions";

export const dynamic = "force-dynamic";

function LevelFields({
  defaults,
}: {
  defaults?: { level: number; minXp: number; title: string };
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="level">Nível</Label>
        <Input
          id="level"
          name="level"
          type="number"
          min={1}
          defaultValue={defaults?.level}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="minXp">XP mínimo</Label>
        <Input
          id="minXp"
          name="minXp"
          type="number"
          min={0}
          defaultValue={defaults?.minXp}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          placeholder="Veterano"
          defaultValue={defaults?.title}
          required
        />
      </div>
    </div>
  );
}

export default async function CourseLevelsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireManageableCourse(courseId);

  const levels = await prisma.levelDefinition.findMany({
    where: { courseId },
    orderBy: { level: "asc" },
  });
  const nextLevel = (levels.at(-1)?.level ?? 0) + 1;
  const nextMinXp = (levels.at(-1)?.minXp ?? 0) + 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          O motor de gamificação resolve o nível do aluno pelo maior “XP mínimo”
          menor ou igual ao XP total. Os limiares devem crescer com o nível.
        </p>
        <FormDialog
          title="Novo nível"
          submitLabel="Criar nível"
          action={createLevel.bind(null, courseId)}
          trigger={<Button>Novo nível</Button>}
        >
          <LevelFields
            defaults={{ level: nextLevel, minXp: nextMinXp, title: "" }}
          />
        </FormDialog>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nível</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="text-right">XP mínimo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.map((level) => (
              <TableRow key={level.id}>
                <TableCell className="font-medium">{level.level}</TableCell>
                <TableCell>{level.title}</TableCell>
                <TableCell className="text-right">{level.minXp} XP</TableCell>
                <TableCell className="flex gap-2">
                  <FormDialog
                    title={`Editar nível ${level.level}`}
                    action={updateLevel.bind(null, level.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  >
                    <LevelFields defaults={level} />
                  </FormDialog>
                  <ConfirmButton
                    action={deleteLevel.bind(null, level.id)}
                    confirmMessage={`Excluir o nível ${level.level} (${level.title})?`}
                  >
                    Excluir
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
