"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SubjectOption = { code: string; name: string };

/// Searchable multi-select of course subjects. Selection is submitted as one
/// hidden input per code (formData.getAll(inputName)). Used by the criteria
/// builder and by track node requirements.
export function SubjectMultiSelect({
  subjects,
  inputName,
  defaultSelected = [],
  onSelectionChange,
  maxHeightClass = "max-h-48",
}: {
  subjects: SubjectOption[];
  inputName: string;
  defaultSelected?: string[];
  onSelectionChange?: (codes: string[]) => void;
  maxHeightClass?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) =>
      `${s.code} ${s.name}`.toLowerCase().includes(q),
    );
  }, [subjects, query]);

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelected(next);
    onSelectionChange?.([...next]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {[...selected].map((code) => (
        <input key={code} type="hidden" name={inputName} value={code} />
      ))}
      <Input
        type="search"
        placeholder="Buscar disciplina por código ou nome…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={cn("overflow-y-auto rounded-md border", maxHeightClass)}>
        {filtered.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">
            Nenhuma disciplina encontrada.
          </p>
        ) : (
          <ul>
            {filtered.map((s) => {
              const checked = selected.has(s.code);
              return (
                <li key={s.code}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                      checked && "bg-primary/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={checked}
                      onChange={() => toggle(s.code)}
                    />
                    <span className="font-mono text-muted-foreground text-xs">
                      {s.code}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {selected.size} disciplina(s) selecionada(s)
      </p>
    </div>
  );
}
