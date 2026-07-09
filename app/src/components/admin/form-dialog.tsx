"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/// Contract of every admin panel server action used in forms: return
/// { error } for expected failures (validation, scope) — never throw them.
export type FormActionResult = { error: string } | undefined;

/// Dialog wrapping a form that posts to a server action; closes on success,
/// shows the returned error inline otherwise.
export function FormDialog({
  trigger,
  title,
  description,
  submitLabel = "Salvar",
  action,
  children,
  wide = false,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  action: (formData: FormData) => Promise<FormActionResult>;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const result = await action(formData);
      if (result?.error) return result.error;
      setOpen(false);
      return null;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={
          wide ? "max-h-[85vh] overflow-y-auto sm:max-w-2xl" : undefined
        }
      >
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          {children}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
