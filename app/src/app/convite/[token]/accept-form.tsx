"use client";

import { useActionState } from "react";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/invites";

export function AcceptInviteForm({
  action,
}: {
  action: (formData: FormData) => Promise<FormActionResult>;
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const password = String(formData.get("password") ?? "");
      const confirm = String(formData.get("confirm") ?? "");
      if (password !== confirm) return "As senhas não conferem.";
      const result = await action(formData);
      return result?.error ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Defina sua senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <p className="text-muted-foreground text-xs">
          Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirme a senha</Label>
        <Input id="confirm" name="confirm" type="password" required />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando conta…" : "Aceitar convite e criar conta"}
      </Button>
    </form>
  );
}
