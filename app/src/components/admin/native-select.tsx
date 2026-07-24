import { cn } from "@/lib/utils";

/// Styled native <select>: submits with plain form posts (no client state),
/// which keeps the admin CRUD dialogs simple. Radix Select stays for richer
/// client-side pickers.
///
/// O `color-scheme` + `bg-background`/`text-foreground` explícitos garantem
/// contraste no menu suspenso nativo das <option> (que ignora herança de cor
/// dentro de Dialog/Sheet em alguns browsers — bug do "texto invisível").
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-foreground text-sm shadow-xs outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
    />
  );
}
