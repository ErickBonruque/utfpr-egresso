"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileActionResult } from "./actions";

/// Defaults for the graduate profile form. Mirrors the `graduate` slice of
/// StudentProgress.profile — null when the egresso left a field empty.
export type GraduateDefaults = {
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  contactEmail: string | null;
  mentorshipAvailable: boolean;
  mentorshipAreas: string[];
  showInShowcase: boolean;
};

/// Self-service form for the GraduateProfile (Fase 7). Professional fields
/// + the privacy/mentorship toggles that drive the public showcase.
/// Follows the same useTransition + toast pattern as ProfileForm.
export function GraduateForm({
  action,
  defaults,
}: {
  action: (formData: FormData) => Promise<ProfileActionResult>;
  defaults: GraduateDefaults;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await action(formData);
          if (result?.error) toast.error(result.error);
          else toast.success("Perfil de egresso atualizado.");
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-company">Empresa atual</Label>
        <Input
          id="gf-company"
          name="company"
          maxLength={120}
          placeholder="Onde você trabalha hoje"
          defaultValue={defaults.company ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-jobtitle">Cargo</Label>
        <Input
          id="gf-jobtitle"
          name="jobTitle"
          maxLength={120}
          placeholder="Ex.: Desenvolvedor(a) de Software"
          defaultValue={defaults.jobTitle ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-linkedin">LinkedIn</Label>
        <Input
          id="gf-linkedin"
          name="linkedinUrl"
          type="url"
          placeholder="https://www.linkedin.com/in/voce"
          defaultValue={defaults.linkedinUrl ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-github">GitHub</Label>
        <Input
          id="gf-github"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/voce"
          defaultValue={defaults.githubUrl ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-contact">E-mail de contato (mentoria)</Label>
        <Input
          id="gf-contact"
          name="contactEmail"
          type="email"
          placeholder="voce@example.com"
          defaultValue={defaults.contactEmail ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          Será o botão de contato na vitrine. Deixe vazio para não exibir. Nunca
          usamos seu e-mail de login.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gf-areas">Áreas de mentoria</Label>
        <Input
          id="gf-areas"
          name="mentorshipAreas"
          placeholder="Carreira, Primeiro estágio, Banco de dados…"
          defaultValue={defaults.mentorshipAreas.join(", ")}
        />
        <p className="text-muted-foreground text-xs">
          Separe por vírgula. Até 5 áreas. Só aparecem se a mentoria estiver
          ativa.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="gf-mentorship"
            name="mentorshipAvailable"
            defaultChecked={defaults.mentorshipAvailable}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="gf-mentorship" className="cursor-pointer">
              Disponível para mentoria
            </Label>
            <p className="text-muted-foreground text-xs">
              Alunos podem te encontrar pelo filtro de mentoria na vitrine.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="gf-showcase"
            name="showInShowcase"
            defaultChecked={defaults.showInShowcase}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="gf-showcase" className="cursor-pointer">
              Aparecer na vitrine de egressos
            </Label>
            <p className="text-muted-foreground text-xs">
              Seu perfil fica visível para outros usuários logados
              (alunos/egressos/admins). Desmarque para ficar oculto.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar perfil de egresso"}
      </Button>
    </form>
  );
}
