import { IconPicker } from "@/components/admin/icon-picker";
import { NativeSelect } from "@/components/admin/native-select";
import { SubjectMultiSelect } from "@/components/admin/subject-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/// Nó de trilha do admin (forma plana consumida pela page e pelo editor
/// visual). Espelha o que a query de `prisma.track.findMany` seleciona.
export type TrackNodeData = {
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

/// Campos de formulário de um nó (nome, tipo, descrição, pai, ordem, XP,
/// ícone, disciplinas exigidas). Compartilhado entre o formulário indentado
/// da page e o painel lateral do editor visual. Submete os mesmos names
/// esperados por `readNodeForm` nas server actions.
export function NodeFields({
  nodes,
  subjects,
  defaults,
  excludeNodeId,
}: {
  nodes: TrackNodeData[];
  subjects: { code: string; name: string }[];
  defaults?: TrackNodeData;
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
