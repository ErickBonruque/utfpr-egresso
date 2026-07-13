"use client";

import { Check, Circle } from "lucide-react";
import { useState } from "react";
import { CareerTree } from "@/components/gamification/career-tree";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CareerTreeNode } from "@/lib/career-tree";
import { cn } from "@/lib/utils";
import type { TrackNodeDetail } from "@/server/student-progress";

type TrackView = {
  id: string;
  name: string;
  description: string | null;
  nodes: CareerTreeNode[];
  details: Record<string, TrackNodeDetail>;
};

const STATE_LABEL: Record<TrackNodeDetail["state"], string> = {
  done: "Concluído",
  "in-progress": "Em progresso",
  locked: "Bloqueado",
};

/// Árvore interativa do aluno: seletor de trilha (quando o curso tem mais de
/// uma), canvas React Flow e painel de detalhes do nó (Sheet — vira
/// bottom-sheet visual no mobile pela própria posição).
export function TreeExplorer({ tracks }: { tracks: TrackView[] }) {
  const [trackId, setTrackId] = useState(tracks[0]?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
  const selected = selectedId ? track.details[selectedId] : null;

  return (
    <div className="flex flex-col gap-4">
      {tracks.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrackId(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                t.id === track.id
                  ? "border-transparent bg-brand font-semibold text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {track.description && (
        <p className="text-muted-foreground text-sm">{track.description}</p>
      )}

      <CareerTree
        nodes={track.nodes}
        onSelect={(node) => setSelectedId(node.id)}
        className="h-[32rem]"
      />

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent side="right" className="w-full sm:w-96">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                {selected.description && (
                  <SheetDescription>{selected.description}</SheetDescription>
                )}
              </SheetHeader>
              <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={selected.state === "done" ? "default" : "outline"}
                    className={cn(
                      selected.state === "done" &&
                        "border-transparent bg-brand text-brand-foreground",
                    )}
                  >
                    {STATE_LABEL[selected.state]}
                  </Badge>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    +{selected.xpReward} XP ao concluir
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="font-medium text-sm">
                    Disciplinas necessárias ({selected.progress}%)
                  </p>
                  {selected.requirements.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Sem requisitos — nó de partida.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {selected.requirements.map((r) => (
                        <li
                          key={r.code}
                          className="flex items-start gap-2 text-sm"
                        >
                          {r.approved ? (
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-success"
                              aria-label="Aprovada"
                            />
                          ) : (
                            <Circle
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-label="Pendente"
                            />
                          )}
                          <span
                            className={cn(
                              !r.approved && "text-muted-foreground",
                            )}
                          >
                            {r.subjectName}{" "}
                            <span className="font-mono text-xs">
                              ({r.code})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selected.careers.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm">Leva às carreiras</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.careers.map((career) => (
                        <Badge key={career} variant="secondary">
                          {career}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
