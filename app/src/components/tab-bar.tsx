"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/// `icon` é um elemento já renderizado (ex.: `<Home className="size-4" />`)
/// para que layouts server possam montar os itens — funções/componentes não
/// atravessam a fronteira RSC → client.
export type TabBarItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/// Navegação inferior do portal do aluno no mobile (wireframe da Fase 5:
/// alcance do polegar; aba ativa com indicador amarelo). O layout
/// consumidor (Fase 6) posiciona: `fixed inset-x-0 bottom-0 md:hidden`.
export function TabBar({
  items,
  className,
}: {
  items: TabBarItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex border-t bg-background", className)}>
      {items.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-2 pt-2 pb-2.5 text-xs transition-colors",
              active
                ? "font-semibold text-foreground shadow-[inset_0_2px_0_var(--brand)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
