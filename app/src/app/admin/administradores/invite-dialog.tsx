"use client";

import { useState } from "react";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminRole } from "@/lib/authz";
import { ROLE_LABEL } from "@/lib/labels";

/// Invite form with role-dependent scope field. Available roles/scopes are
/// pre-filtered by the server page (SUPER_ADMIN: all; CAMPUS_ADMIN: only
/// COURSE_ADMIN of its campus' courses).
export function InviteDialog({
  action,
  allowedRoles,
  campuses,
  courses,
}: {
  action: (formData: FormData) => Promise<FormActionResult>;
  allowedRoles: AdminRole[];
  campuses: { id: string; name: string; code: string }[];
  courses: { id: string; name: string; campusCode: string }[];
}) {
  const [role, setRole] = useState<AdminRole>(
    allowedRoles.includes("COURSE_ADMIN") ? "COURSE_ADMIN" : allowedRoles[0],
  );

  return (
    <FormDialog
      title="Convidar administrador"
      description="Sem SMTP configurado, o link do convite fica disponível na lista de pendentes para você copiar e enviar. Válido por 7 dias."
      submitLabel="Gerar convite"
      action={action}
      trigger={<Button>Convidar administrador</Button>}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-name">Nome</Label>
          <Input id="invite-name" name="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">E-mail</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">Papel</Label>
        <NativeSelect
          id="invite-role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
        >
          {allowedRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {role === "CAMPUS_ADMIN" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-campus">Campus</Label>
          <NativeSelect id="invite-campus" name="campusId" required>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {role === "COURSE_ADMIN" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-course">Curso</Label>
          <NativeSelect id="invite-course" name="courseId" required>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.campusCode}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
    </FormDialog>
  );
}
