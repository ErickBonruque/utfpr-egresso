import { cn } from "@/lib/utils";

/// Styled native <select>: submits with plain form posts (no client state),
/// which keeps the admin CRUD dialogs simple. Radix Select stays for richer
/// client-side pickers.
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
    />
  );
}
