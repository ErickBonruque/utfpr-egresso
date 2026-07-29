import { cn } from "@/lib/utils";

/// Styled native <select>: submits with plain form posts (no client state),
/// which keeps the admin CRUD dialogs simple. Radix Select stays for richer
/// client-side pickers.
///
/// O menu suspenso das <option> é desenhado pelo sistema operacional. Sem
/// `background-color` explícito a option fica transparente e o popup cai no
/// branco padrão do SO — enquanto o texto herda `--foreground` (quase branco
/// no tema escuro), resultando em texto invisível. Por isso as options levam
/// fundo E cor explícitos, além do `color-scheme`. Ponto único do site para
/// <select> nativo: toda tela importa daqui (não estilizar <select> inline).
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-foreground text-sm shadow-xs outline-none transition-colors [color-scheme:light] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:[color-scheme:dark]",
        "[&_optgroup]:bg-background [&_optgroup]:text-foreground [&_option]:bg-background [&_option]:text-foreground",
        className,
      )}
    />
  );
}
