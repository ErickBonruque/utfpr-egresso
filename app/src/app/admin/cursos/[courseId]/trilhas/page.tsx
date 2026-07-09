import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormDialog } from "@/components/admin/form-dialog";
import { GamIcon } from "@/components/admin/gam-icon";
import { IconPicker } from "@/components/admin/icon-picker";
import { NativeSelect } from "@/components/admin/native-select";
import { SubjectMultiSelect } from "@/components/admin/subject-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TRACK_NODE_KIND_LABEL } from "@/lib/labels";
import { requireManageableCourse } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import {
  createNode,
  createTrack,
  deleteNode,
  deleteTrack,
  updateNode,
  updateTrack,
} from "./actions";

export const dynamic = "force-dynamic";

type NodeWithData = {
  id: string;
  parentId: string | null;
  kind: "CORE" | "BRANCH";
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  xpReward: number;
  requirements: { subject: { code: string; name: string } }[];
};

/// Flattens the node tree into render order (parents first, DFS by sortOrder).
function flattenTree(
  nodes: NodeWithData[],
): { node: NodeWithData; depth: number }[] {
  const byParent = new Map<string | null, NodeWithData[]>();
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }
  const result: { node: NodeWithData; depth: number }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      result.push({ node, depth });
      visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

function NodeFields({
  nodes,
  subjects,
  defaults,
  excludeNodeId,
}: {
  nodes: NodeWithData[];
  subjects: { code: string; name: string }[];
  defaults?: NodeWithData;
  excludeNodeId?: string;
}) {
  const parentOptions = nodes.filter((n) => n.id !== excludeNodeId);
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="name">Nome do nó</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Tipo</Label>
          <NativeSelect
            id="kind"
            name="kind"
            defaultValue={defaults?.kind ?? "CORE"}
          >
            <option value="CORE">Progressão</option>
            <option value="BRANCH">Especialização</option>
          </NativeSelect>
        </div>
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
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="parentId">Nó pai</Label>
          <NativeSelect
            id="parentId"
            name="parentId"
            defaultValue={defaults?.parentId ?? ""}
          >
            <option value="">— raiz da trilha —</option>
            {parentOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Ordem</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={defaults?.sortOrder ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="xpReward">XP</Label>
          <Input
            id="xpReward"
            name="xpReward"
            type="number"
            min={0}
            defaultValue={defaults?.xpReward ?? 100}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Ícone</Label>
        <IconPicker defaultValue={defaults?.icon} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Disciplinas exigidas para desbloquear</Label>
        <SubjectMultiSelect
          subjects={subjects}
          inputName="subjectCodes"
          defaultSelected={defaults?.requirements.map((r) => r.subject.code)}
          maxHeightClass="max-h-36"
        />
      </div>
    </>
  );
}

export default async function CourseTracksPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireManageableCourse(courseId);

  const [tracks, subjects] = await Promise.all([
    prisma.track.findMany({
      where: { courseId },
      orderBy: { name: "asc" },
      include: {
        nodes: {
          include: {
            requirements: {
              include: { subject: { select: { code: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.subject.findMany({
      where: { courseId },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {tracks.length} trilha(s). Os nós formam a árvore de carreiras que o
          aluno percorre; nós de especialização ramificam a progressão.
        </p>
        <FormDialog
          title="Nova trilha"
          submitLabel="Criar trilha"
          action={createTrack.bind(null, courseId)}
          trigger={<Button>Nova trilha</Button>}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              placeholder="Trilha de Computação"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
        </FormDialog>
      </div>

      {tracks.map((track) => {
        const flat = flattenTree(track.nodes);
        return (
          <Card key={track.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{track.name}</CardTitle>
                <span className="text-muted-foreground text-xs">
                  {track.nodes.length} nó(s)
                </span>
                <div className="ml-auto flex gap-2">
                  <FormDialog
                    wide
                    title={`Novo nó — ${track.name}`}
                    submitLabel="Criar nó"
                    action={createNode.bind(null, track.id)}
                    trigger={<Button size="sm">Novo nó</Button>}
                  >
                    <NodeFields nodes={track.nodes} subjects={subjects} />
                  </FormDialog>
                  <FormDialog
                    title={`Editar ${track.name}`}
                    action={updateTrack.bind(null, track.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={track.name}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        rows={2}
                        defaultValue={track.description ?? ""}
                      />
                    </div>
                  </FormDialog>
                  <ConfirmButton
                    action={deleteTrack.bind(null, track.id)}
                    confirmMessage={`Excluir a trilha "${track.name}" com todos os seus ${track.nodes.length} nó(s)? Ação irreversível.`}
                  >
                    Excluir
                  </ConfirmButton>
                </div>
              </div>
              {track.description ? (
                <CardDescription>{track.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {flat.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Sem nós ainda — crie o primeiro nó raiz.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {flat.map(({ node, depth }) => (
                    <li
                      key={node.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                      style={{ marginLeft: depth * 24 }}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <GamIcon name={node.icon} className="size-3.5" />
                      </span>
                      <span className="font-medium text-sm">{node.name}</span>
                      <Badge
                        variant={
                          node.kind === "BRANCH" ? "outline" : "secondary"
                        }
                      >
                        {TRACK_NODE_KIND_LABEL[node.kind]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {node.xpReward} XP ·{" "}
                        {node.requirements.length > 0
                          ? node.requirements
                              .map((r) => r.subject.code)
                              .join(", ")
                          : "sem requisitos"}
                      </span>
                      <div className="ml-auto flex shrink-0 gap-1">
                        <FormDialog
                          wide
                          title={`Editar nó ${node.name}`}
                          action={updateNode.bind(null, node.id)}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          }
                        >
                          <NodeFields
                            nodes={track.nodes}
                            subjects={subjects}
                            defaults={node}
                            excludeNodeId={node.id}
                          />
                        </FormDialog>
                        <ConfirmButton
                          action={deleteNode.bind(null, node.id)}
                          confirmMessage={`Excluir o nó "${node.name}"? Nós filhos também serão excluídos.`}
                          variant="ghost"
                        >
                          Excluir
                        </ConfirmButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
