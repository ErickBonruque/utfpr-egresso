"use client";

import { Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { cn } from "@/lib/utils";

type AchievementItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  xpReward: number;
  state: "unlocked" | "in-progress" | "locked";
  progress: number;
};

/// Grid de conquistas com filtro por categoria (categorias vêm do admin,
/// não são hardcoded). Bloqueadas ficam visíveis — ver o que falta é parte
/// da motivação (decisão de design da Fase 5).
export function AchievementsGrid({
  achievements,
}: {
  achievements: AchievementItem[];
}) {
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(achievements.map((a) => a.category))].sort(),
    [achievements],
  );
  const visible = category
    ? achievements.filter((a) => a.category === category)
    : achievements;
  // Desbloqueadas primeiro, depois em progresso (maior % primeiro).
  const sorted = [...visible].sort((a, b) => {
    const rank = { unlocked: 0, "in-progress": 1, locked: 2 };
    return rank[a.state] - rank[b.state] || b.progress - a.progress;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            category === null
              ? "border-transparent bg-brand font-semibold text-brand-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              category === c
                ? "border-transparent bg-brand font-semibold text-brand-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhuma conquista nesta categoria"
          description="A coordenação pode criar novas conquistas a qualquer momento."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => (
            <AchievementCard
              key={a.id}
              name={a.name}
              description={a.description}
              icon={a.icon}
              xp={a.xpReward}
              category={a.category}
              state={a.state}
              progress={a.progress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
