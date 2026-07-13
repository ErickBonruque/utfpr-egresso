import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/// Estado vazio padrão: sempre nomeia o que está vazio e oferece a próxima
/// ação quando existir (decisão da Fase 5 — nada de telas em branco).
/// Server-safe.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
