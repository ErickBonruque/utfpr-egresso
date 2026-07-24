import { Briefcase, Home, Network, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { LevelBadge } from "@/components/gamification/level-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { TabBar } from "@/components/tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getStudentProgress } from "@/server/student-progress";
import { StudentNavLinks } from "./nav-links";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/painel", label: "Início", icon: Home },
  { href: "/arvore", label: "Árvore", icon: Network },
  { href: "/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/vagas", label: "Vagas", icon: Briefcase },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

/// Student portal chrome (Fase 6): top bar with desktop nav + level badge;
/// fixed bottom TabBar on mobile (approved Fase 5 wireframe).
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const progress = await getStudentProgress();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
          <Link
            href="/painel"
            className="rounded-md bg-brand px-2 py-0.5 font-heading font-semibold text-brand-foreground"
          >
            CEA
          </Link>
          <StudentNavLinks
            items={NAV_ITEMS.map(({ href, label }) => ({ href, label }))}
          />
          <div className="ml-auto flex items-center gap-2">
            <LevelBadge
              level={progress.xp.level.level}
              title={progress.xp.level.title}
              className="hidden sm:inline-flex"
            />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8 pb-24 md:pb-8">
        {children}
      </main>

      <TabBar
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        items={NAV_ITEMS.map(({ href, label, icon: Icon }) => ({
          href,
          label,
          icon: <Icon className="size-4" aria-hidden />,
        }))}
      />
    </div>
  );
}
