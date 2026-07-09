"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { parseCurriculumImport } from "@/lib/curriculum-import";

/// Bulk import with live preview: the same parser runs here (feedback) and in
/// the server action (authority). All-or-nothing on submit.
export function ImportDialog({
  action,
  curriculumVersion,
}: {
  action: (formData: FormData) => Promise<FormActionResult>;
  curriculumVersion: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const preview = useMemo(() => parseCurriculumImport(text), [text]);

  const [error, formAction, pending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const result = await action(formData);
      if (result?.error) return result.error;
      setOpen(false);
      setText("");
      return null;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Importar em lote</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              Importar disciplinas — matriz {curriculumVersion}
            </DialogTitle>
            <DialogDescription>
              Cole uma disciplina por linha, colunas separadas por “;” ou TAB:
              CÓDIGO; NOME; CARGA HORÁRIA; PERÍODO; ELETIVA (opcional); GRUPO
              (opcional). Período 0 marca eletiva. Disciplinas já existentes
              (mesmo código) são atualizadas.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={
              "CC1AED1; Algoritmos e Estruturas de Dados 1; 90; 2\nCC1MD1; Matemática Discreta; 60; 1"
            }
            className="font-mono text-xs"
          />

          {preview.errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-inside list-disc">
                  {preview.errors.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {preview.errors.length > 8 ? (
                    <li>… e mais {preview.errors.length - 8} erro(s).</li>
                  ) : null}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {preview.rows.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Código</th>
                    <th className="px-2 py-1.5 font-medium">Nome</th>
                    <th className="px-2 py-1.5 font-medium">CH</th>
                    <th className="px-2 py-1.5 font-medium">Período</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.code} className="border-t">
                      <td className="px-2 py-1 font-mono">{row.code}</td>
                      <td className="px-2 py-1">{row.name}</td>
                      <td className="px-2 py-1">{row.workloadHours}h</td>
                      <td className="px-2 py-1">
                        {row.isElective ? (
                          <Badge variant="outline">
                            Eletiva
                            {row.electiveGroup ? ` ${row.electiveGroup}` : ""}
                          </Badge>
                        ) : (
                          `${row.period}º`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

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
            <Button
              type="submit"
              disabled={
                pending ||
                preview.rows.length === 0 ||
                preview.errors.length > 0
              }
            >
              {pending
                ? "Importando…"
                : `Importar ${preview.rows.length} disciplina(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
