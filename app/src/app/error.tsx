"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fronteira de erro de rota (Fase 9). O Next já registrou a exceção pelo
// onRequestError (src/instrumentation.ts); aqui só resta falar com o usuário.
// O `digest` é o elo entre o print que ele manda e a linha do log.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h1 className="font-semibold text-2xl">Algo deu errado</h1>
      <p className="text-muted-foreground">
        A página não pôde ser carregada. Tente novamente — se continuar, informe
        o código abaixo à administração.
      </p>
      {error.digest && (
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
          {error.digest}
        </code>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Tentar novamente
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </main>
  );
}
