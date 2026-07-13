import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("pt-BR");

/// Barra de XP do aluno dentro do nível atual. XP/progresso são sempre
/// amarelos (regra de uso da marca — Fase 5). Server-safe.
export function XpBar({
  totalXp,
  levelMinXp,
  nextLevelMinXp,
  className,
}: {
  totalXp: number;
  /// minXp do nível atual (LevelDefinition).
  levelMinXp: number;
  /// minXp do próximo nível; null quando o aluno está no nível máximo.
  nextLevelMinXp: number | null;
  className?: string;
}) {
  const span = nextLevelMinXp === null ? 0 : nextLevelMinXp - levelMinXp;
  const pct =
    nextLevelMinXp === null
      ? 100
      : span <= 0
        ? 0
        : Math.min(100, Math.max(0, ((totalXp - levelMinXp) / span) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Progress
        value={pct}
        aria-label="Progresso de XP no nível atual"
        className="h-2 [&>[data-slot=progress-indicator]]:bg-brand"
      />
      <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
        <span>{nf.format(totalXp)} XP</span>
        <span>
          {nextLevelMinXp === null
            ? "Nível máximo"
            : `${nf.format(nextLevelMinXp - totalXp)} XP para o próximo nível`}
        </span>
      </div>
    </div>
  );
}
