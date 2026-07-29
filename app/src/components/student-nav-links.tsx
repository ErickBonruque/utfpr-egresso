"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/// Desktop nav of the student portal — active link gets the yellow pill
/// (same language as the admin sidebar).
export function StudentNavLinks({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="hidden gap-1 md:flex">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // px menor no tablet: com 6 itens o menu + badge de nível
              // estouravam a largura exatamente em 768px (breakpoint `md`).
              "rounded-md px-2 py-1.5 text-sm transition-colors lg:px-3",
              active
                ? "bg-brand font-medium text-brand-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
