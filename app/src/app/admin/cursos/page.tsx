import Link from "next/link";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormDialog } from "@/components/admin/form-dialog";
import { NativeSelect } from "@/components/admin/native-select";
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
import { canManageCampus } from "@/lib/authz";
import { DEGREE_LABEL } from "@/lib/labels";
import { requireAdmin } from "@/server/actor";
import {
  getManageableCampuses,
  getManageableCourses,
} from "@/server/admin-scope";
import { createCourse, deleteCourse, updateCourse } from "./actions";

export const dynamic = "force-dynamic";

function DegreeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="degree">Grau</Label>
      <NativeSelect
        id="degree"
        name="degree"
        defaultValue={defaultValue ?? "BACHELORS"}
        required
      >
        {Object.entries(DEGREE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export default async function AdminCoursesPage() {
  const actor = await requireAdmin();
  const [courses, campuses] = await Promise.all([
    getManageableCourses(actor),
    getManageableCampuses(actor),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Cursos</h1>
          <p className="text-muted-foreground text-sm">
            Clique em um curso para gerenciar matriz curricular, conquistas,
            trilhas e carreiras.
          </p>
        </div>
        {campuses.length > 0 ? (
          <FormDialog
            title="Novo curso"
            submitLabel="Criar curso"
            action={createCourse}
            trigger={<Button>Novo curso</Button>}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusId">Campus</Label>
              <NativeSelect id="campusId" name="campusId" required>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome do curso</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ciência da Computação"
                required
              />
            </div>
            <DegreeSelect />
          </FormDialog>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Grau</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <Link
                    href={`/admin/cursos/${course.id}`}
                    className="font-medium hover:underline"
                  >
                    {course.name}
                  </Link>
                </TableCell>
                <TableCell>{DEGREE_LABEL[course.degree]}</TableCell>
                <TableCell>
                  <Badge variant="outline">{course.campus.code}</Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <FormDialog
                    title={`Editar ${course.name}`}
                    action={updateCourse.bind(null, course.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="name">Nome do curso</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={course.name}
                        required
                      />
                    </div>
                    <DegreeSelect defaultValue={course.degree} />
                  </FormDialog>
                  {canManageCampus(actor, course.campus.id) ? (
                    <ConfirmButton
                      action={deleteCourse.bind(null, course.id)}
                      confirmMessage={`Excluir ${course.name}? Disciplinas, conquistas, trilhas e carreiras do curso serão removidas em cascata. Ação irreversível.`}
                    >
                      Excluir
                    </ConfirmButton>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
