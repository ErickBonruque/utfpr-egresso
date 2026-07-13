"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CurriculumPeriodView } from "@/server/student-progress";

type Status = CurriculumPeriodView["entries"][number]["status"];
type Filter = "ALL" | Status;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "IN_PROGRESS", label: "Cursando" },
  { value: "FAILED", label: "Reprovadas" },
  { value: "PENDING", label: "Pendentes" },
];

const STATUS_STYLE: Record<Status, { dot: string; card: string }> = {
  APPROVED: { dot: "bg-success", card: "border-success/40" },
  IN_PROGRESS: { dot: "bg-brand", card: "border-brand/60" },
  FAILED: { dot: "bg-destructive", card: "border-destructive/40" },
  PENDING: { dot: "bg-muted-foreground/40", card: "opacity-70" },
};

const STATUS_LABEL: Record<Status, string> = {
  APPROVED: "Aprovada",
  IN_PROGRESS: "Cursando",
  FAILED: "Reprovada",
  PENDING: "Pendente",
};

/// Mapa curricular (herdado da POC, agora dirigido pelo banco): uma coluna
/// por período com filtro por status e legenda. Rola horizontalmente no
/// mobile.
export function CurriculumMap({
  periods,
}: {
  periods: CurriculumPeriodView[];
}) {
  const [filter, setFilter] = useState<Filter>("ALL");

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                filter === f.value
                  ? "border-transparent bg-brand font-semibold text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto hidden flex-wrap gap-3 text-muted-foreground text-xs sm:flex">
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={cn("size-2 rounded-full", STATUS_STYLE[s].dot)}
              />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-3">
          {periods.map((period) => {
            const entries =
              filter === "ALL"
                ? period.entries
                : period.entries.filter((e) => e.status === filter);
            return (
              <div
                key={period.period}
                className="flex w-44 shrink-0 flex-col gap-2"
              >
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {period.period}º período
                </p>
                {entries.length === 0 ? (
                  <p className="rounded-md border border-dashed px-2 py-3 text-center text-muted-foreground text-xs">
                    —
                  </p>
                ) : (
                  entries.map((e) => (
                    <div
                      key={e.code}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-md border bg-background px-2.5 py-2",
                        STATUS_STYLE[e.status].card,
                      )}
                      title={`${e.name} · ${STATUS_LABEL[e.status]}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_STYLE[e.status].dot,
                          )}
                        />
                        <span className="font-medium font-mono text-[11px]">
                          {e.code}
                        </span>
                        {e.isElective && (
                          <span className="text-[10px] text-muted-foreground">
                            optativa
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-muted-foreground text-xs">
                        {e.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {e.workloadHours}h
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
