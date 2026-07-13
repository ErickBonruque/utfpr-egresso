import { Lock } from "lucide-react";
import { GamIcon } from "@/components/gam-icon";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type AchievementCardState = "unlocked" | "in-progress" | "locked";

const nf = new Intl.NumberFormat("pt-BR");

/// Card de conquista do portal do aluno. Bloqueadas ficam dessaturadas mas
/// sempre visíveis, com o critério legível (texto do CriteriaBuilder) —
/// ver o que falta é parte da motivação. Server-safe.
export function AchievementCard({
  name,
  description,
  icon,
  xp,
  category,
  state,
  progress = 0,
  className,
}: {
  name: string;
  description?: string | null;
  icon?: string | null;
  xp: number;
  category?: string | null;
  state: AchievementCardState;
  /// 0–100; usado quando state === "in-progress".
  progress?: number;
  className?: string;
}) {
  const locked = state === "locked";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground",
        state === "unlocked" && "border-brand",
        locked && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            state === "unlocked"
              ? "border-transparent bg-brand text-brand-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {locked ? (
            <Lock className="size-4" aria-hidden />
          ) : (
            <GamIcon name={icon} className="size-4" />
          )}
        </span>
        {category && <Badge variant="outline">{category}</Badge>}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-sm leading-tight">{name}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>

      {state === "in-progress" && (
        <Progress
          value={progress}
          aria-label={`Progresso da conquista ${name}`}
          className="h-1.5 [&>[data-slot=progress-indicator]]:bg-brand"
        />
      )}

      <span
        className={cn(
          "mt-auto self-start rounded-full px-2 py-0.5 font-semibold text-xs tabular-nums",
          state === "unlocked"
            ? "bg-brand text-brand-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        +{nf.format(xp)} XP
      </span>
    </div>
  );
}
