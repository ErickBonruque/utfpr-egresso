import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/// Renders a gamification icon by its stored kebab-case name (falls back to
/// "sparkles" for names outside the curated set). Server-safe.
export function GamIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = resolveIcon(name);
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
