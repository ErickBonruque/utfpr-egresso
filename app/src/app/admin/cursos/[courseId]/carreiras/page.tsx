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
import { Textarea } from "@/components/ui/textarea";
import { requireManageableCourse } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import { createCareer, deleteCareer, updateCareer } from "./actions";
import { NodeMultiSelect, type TrackNodeOption } from "./node-multi-select";

export const dynamic = "force-dynamic";

function CareerFields({
  nodeOptions,
  defaults,
}: {
  nodeOptions: TrackNodeOption[];
  defaults?: { name: string; description: string | null; nodeIds: string[] };
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome da carreira</Label>
        <Input
          id="name"
          name="name"
          placeholder="Engenharia de Dados"
          defaultValue={defaults?.name}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Nós de trilha que levam à carreira</Label>
        <NodeMultiSelect
          nodes={nodeOptions}
          defaultSelected={defaults?.nodeIds}
        />
      </div>
    </>
  );
}

export default async function CourseCareersPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireManageableCourse(courseId);

  const [careers, nodes] = await Promise.all([
    prisma.career.findMany({
      where: { courseId },
      orderBy: { name: "asc" },
      include: {
        nodes: { include: { node: { select: { id: true, name: true } } } },
      },
    }),
    prisma.trackNode.findMany({
      where: { track: { courseId } },
      orderBy: [{ track: { name: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, track: { select: { name: true } } },
    }),
  ]);

  const nodeOptions: TrackNodeOption[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    trackName: n.track.name,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {careers.length} carreira(s). Cada carreira é alcançada pelos nós de
          trilha selecionados — o aluno vê para onde cada caminho leva.
        </p>
        <FormDialog
          wide
          title="Nova carreira"
          submitLabel="Criar carreira"
          action={createCareer.bind(null, courseId)}
          trigger={<Button>Nova carreira</Button>}
        >
          <CareerFields nodeOptions={nodeOptions} />
        </FormDialog>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carreira</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Nós de trilha</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {careers.map((career) => (
              <TableRow key={career.id}>
                <TableCell className="font-medium">{career.name}</TableCell>
                <TableCell className="max-w-64 text-muted-foreground text-xs">
                  {career.description ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-72 flex-wrap gap-1">
                    {career.nodes.map(({ node }) => (
                      <Badge key={node.id} variant="outline">
                        {node.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="flex gap-2">
                  <FormDialog
                    wide
                    title={`Editar ${career.name}`}
                    action={updateCareer.bind(null, career.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  >
                    <CareerFields
                      nodeOptions={nodeOptions}
                      defaults={{
                        name: career.name,
                        description: career.description,
                        nodeIds: career.nodes.map(({ node }) => node.id),
                      }}
                    />
                  </FormDialog>
                  <ConfirmButton
                    action={deleteCareer.bind(null, career.id)}
                    confirmMessage={`Excluir a carreira "${career.name}"?`}
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
