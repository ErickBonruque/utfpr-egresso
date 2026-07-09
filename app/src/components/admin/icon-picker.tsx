"use client";

import { useState } from "react";
import { ICON_NAMES, ICON_SET } from "@/lib/icons";
import { cn } from "@/lib/utils";

/// Visual picker over the curated lucide set; submits the kebab-case icon
/// name through a hidden input (empty = no icon).
export function IconPicker({
  inputName = "icon",
  defaultValue,
}: {
  inputName?: string;
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = useState(defaultValue ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={inputName} value={selected} />
      <div className="grid max-h-36 grid-cols-9 gap-1 overflow-y-auto rounded-md border p-2">
        {ICON_NAMES.map((name) => {
          const Icon = ICON_SET[name];
          const active = name === selected;
          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-pressed={active}
              onClick={() => setSelected(active ? "" : name)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {selected ? `Ícone selecionado: ${selected}` : "Sem ícone selecionado"}
      </p>
    </div>
  );
}
