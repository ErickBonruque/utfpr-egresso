"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type TrackNodeOption = {
  id: string;
  name: string;
  trackName: string;
};

/// Checkbox list of track nodes grouped by track; submits one hidden input
/// per selected node id (formData.getAll("nodeIds")).
export function NodeMultiSelect({
  nodes,
  defaultSelected = [],
}: {
  nodes: TrackNodeOption[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected),
  );
  const tracks = [...new Set(nodes.map((n) => n.trackName))];

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="nodeIds" value={id} />
      ))}
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {nodes.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">
            Este curso ainda não tem nós de trilha — crie-os na aba Trilhas.
          </p>
        ) : (
          tracks.map((trackName) => (
            <div key={trackName}>
              <p className="bg-muted px-3 py-1 font-medium text-muted-foreground text-xs">
                {trackName}
              </p>
              <ul>
                {nodes
                  .filter((n) => n.trackName === trackName)
                  .map((node) => {
                    const checked = selected.has(node.id);
                    return (
                      <li key={node.id}>
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
                            onChange={() => toggle(node.id)}
                          />
                          {node.name}
                        </label>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {selected.size} nó(s) levam a esta carreira
      </p>
    </div>
  );
}
