"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GraduateCard, type GraduateCardData } from "./graduate-card";

/// Client-side search + filters for the alumni showcase (Fase 7). Volume is
/// low today (one campus, three courses), so we filter in the browser. Server-
/// side pagination/sorting is a Fase 9 concern (noted in the decision doc).
export function GraduateSearch({
  graduates,
  campi,
  courses,
}: {
  graduates: GraduateCardData[];
  campi: string[];
  courses: string[];
}) {
  const [query, setQuery] = useState("");
  const [campus, setCampus] = useState("");
  const [course, setCourse] = useState("");
  const [mentorshipOnly, setMentorshipOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return graduates.filter((g) => {
      if (campus && g.campusName !== campus) return false;
      if (course && g.courseName !== course) return false;
      if (mentorshipOnly && !g.mentorshipAvailable) return false;
      if (!q) return true;
      const haystack = [
        g.name,
        g.company ?? "",
        g.jobTitle ?? "",
        g.bio ?? "",
        ...g.mentorshipAreas,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [graduates, query, campus, course, mentorshipOnly]);

  const hasFilters =
    query !== "" || campus !== "" || course !== "" || mentorshipOnly;

  function clearFilters() {
    setQuery("");
    setCampus("");
    setCourse("");
    setMentorshipOnly(false);
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-foreground text-sm shadow-xs outline-none transition-colors [color-scheme:light] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:[color-scheme:dark] dark:bg-input/30";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, empresa, cargo, área…"
            className="pl-9"
            aria-label="Buscar egressos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className={cn(selectClass, "min-w-32")}
            aria-label="Filtrar por campus"
          >
            <option value="">Todos os campi</option>
            {campi.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className={cn(selectClass, "min-w-40")}
            aria-label="Filtrar por curso"
          >
            <option value="">Todos os cursos</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setMentorshipOnly((v) => !v)}
            aria-pressed={mentorshipOnly}
            className={cn(
              "h-9 rounded-md border px-3 text-sm transition-colors",
              mentorshipOnly
                ? "border-brand bg-brand text-brand-foreground"
                : "border-input bg-background text-foreground hover:bg-muted",
            )}
          >
            Só mentores
          </button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" aria-hidden />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} egresso(s) encontrado(s)
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum egresso corresponde à busca.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GraduateCard key={`${g.name}-${g.courseName}`} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
