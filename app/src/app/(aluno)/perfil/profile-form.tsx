"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileActionResult } from "./actions";

/// Formulário dos dados que o aluno controla (bio + links profissionais).
/// Dados acadêmicos não aparecem aqui: são espelho da UTFPR, somente
/// leitura.
export function ProfileForm({
  action,
  defaults,
}: {
  action: (formData: FormData) => Promise<ProfileActionResult>;
  defaults: {
    bio: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await action(formData);
          if (result?.error) toast.error(result.error);
          else toast.success("Perfil atualizado.");
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-bio">Bio</Label>
        <Textarea
          id="pf-bio"
          name="bio"
          maxLength={500}
          rows={4}
          placeholder="Conte em poucas linhas quem você é e o que busca."
          defaultValue={defaults.bio ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          Máx. 500 caracteres. Aparecerá no seu perfil de egresso (Fase 7).
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-linkedin">LinkedIn</Label>
        <Input
          id="pf-linkedin"
          name="linkedinUrl"
          type="url"
          placeholder="https://www.linkedin.com/in/voce"
          defaultValue={defaults.linkedinUrl ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-github">GitHub</Label>
        <Input
          id="pf-github"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/voce"
          defaultValue={defaults.githubUrl ?? ""}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
