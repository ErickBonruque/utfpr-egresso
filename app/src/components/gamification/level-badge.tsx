import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/// Badge de nível do aluno (ex.: "Nível 7 · Veterano"). O título vem da
/// LevelDefinition configurada no admin. Server-safe.
export function LevelBadge({
  level,
  title,
  className,
}: {
  level: number;
  title?: string | null;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border-transparent bg-brand font-semibold text-brand-foreground",
        className,
      )}
    >
      Nível {level}
      {title ? ` · ${title}` : ""}
    </Badge>
  );
}
