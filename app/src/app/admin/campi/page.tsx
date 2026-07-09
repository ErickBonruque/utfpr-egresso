import { redirect } from "next/navigation";
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
import { isSuperAdmin } from "@/lib/authz";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { createCampus, deleteCampus, updateCampus } from "./actions";

export const dynamic = "force-dynamic";

function CampusFields({
  defaults,
}: {
  defaults?: { code: string; name: string; city: string; state: string };
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Sigla</Label>
          <Input
            id="code"
            name="code"
            placeholder="SH"
            maxLength={4}
            defaultValue={defaults?.code}
            required
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            placeholder="Santa Helena"
            defaultValue={defaults?.name}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            placeholder="Santa Helena"
            defaultValue={defaults?.city}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">UF</Label>
          <Input
            id="state"
            name="state"
            maxLength={2}
            defaultValue={defaults?.state ?? "PR"}
            required
          />
        </div>
      </div>
    </>
  );
}

export default async function AdminCampusesPage() {
  const actor = await requireAdmin();
  if (!isSuperAdmin(actor)) redirect("/admin");

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Campi</h1>
          <p className="text-muted-foreground text-sm">
            Campi da UTFPR cadastrados na plataforma. A sigla é a chave usada na
            integração com os dados institucionais.
          </p>
        </div>
        <FormDialog
          title="Novo campus"
          submitLabel="Criar campus"
          action={createCampus}
          trigger={<Button>Novo campus</Button>}
        >
          <CampusFields />
        </FormDialog>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="text-right">Cursos</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campuses.map((campus) => (
              <TableRow key={campus.id}>
                <TableCell className="font-mono">{campus.code}</TableCell>
                <TableCell className="font-medium">{campus.name}</TableCell>
                <TableCell>
                  {campus.city}/{campus.state}
                </TableCell>
                <TableCell className="text-right">
                  {campus._count.courses}
                </TableCell>
                <TableCell className="flex gap-2">
                  <FormDialog
                    title={`Editar ${campus.name}`}
                    action={updateCampus.bind(null, campus.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  >
                    <CampusFields defaults={campus} />
                  </FormDialog>
                  <ConfirmButton
                    action={deleteCampus.bind(null, campus.id)}
                    confirmMessage={`Excluir o campus ${campus.name}? Só é possível quando não há cursos vinculados.`}
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
