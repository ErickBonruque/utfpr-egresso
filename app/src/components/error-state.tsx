"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/// Estado de erro padrão: nomeia o problema e oferece retry. Sem onRetry,
/// o botão refaz a rota atual (router.refresh) — cobre falhas transitórias
/// de fetch em Server Components.
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-destructive/50 p-4",
        className,
      )}
      role="alert"
    >
      <p className="flex items-center gap-2 font-medium text-destructive text-sm">
        <AlertTriangle className="size-4" aria-hidden />
        {title}
      </p>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry ?? (() => router.refresh())}
      >
        Tentar novamente
      </Button>
    </div>
  );
}
