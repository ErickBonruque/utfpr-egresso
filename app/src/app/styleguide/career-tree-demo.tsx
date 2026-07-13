"use client";

import { useState } from "react";
import { CareerTree } from "@/components/gamification/career-tree";
import { XpBar } from "@/components/gamification/xp-bar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CareerTreeNode } from "@/lib/career-tree";

const SAMPLE_NODES: CareerTreeNode[] = [
  {
    id: "fund",
    parentId: null,
    title: "Fundamentos de Programação",
    icon: "code",
    xp: 150,
    state: "done",
    progress: 100,
  },
  {
    id: "ed",
    parentId: "fund",
    title: "Estruturas de Dados",
    icon: "database",
    xp: 200,
    state: "done",
    progress: 100,
  },
  {
    id: "web",
    parentId: "fund",
    title: "Desenvolvimento Web",
    icon: "globe",
    xp: 250,
    state: "in-progress",
    progress: 62,
  },
  {
    id: "ia",
    parentId: "ed",
    title: "Inteligência Artificial",
    icon: "brain",
    xp: 300,
    state: "locked",
    progress: 0,
  },
  {
    id: "senior",
    parentId: "web",
    title: "Eng. de Software Sênior",
    icon: "rocket",
    xp: 400,
    state: "locked",
    progress: 0,
  },
];

const STATE_LABEL: Record<CareerTreeNode["state"], string> = {
  done: "Concluído",
  "in-progress": "Em progresso",
  locked: "Bloqueado",
};

/// Demo da árvore no styleguide: clique num nó abre o painel de detalhes
/// (Sheet) — no mobile o mesmo componente vira bottom-sheet via side.
export function CareerTreeDemo() {
  const [selected, setSelected] = useState<CareerTreeNode | null>(null);

  return (
    <>
      <CareerTree nodes={SAMPLE_NODES} onSelect={setSelected} />
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="w-80">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  Detalhes do nó selecionado — na Fase 6 esta área lista os
                  requisitos (disciplinas) com o progresso real do aluno.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4">
                <Badge variant="outline">{STATE_LABEL[selected.state]}</Badge>
                <XpBar
                  totalXp={selected.progress}
                  levelMinXp={0}
                  nextLevelMinXp={100}
                />
                <p className="text-muted-foreground text-sm tabular-nums">
                  Recompensa: +{selected.xp} XP
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
