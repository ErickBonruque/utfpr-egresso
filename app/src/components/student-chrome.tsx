import {
  Briefcase,
  GraduationCap,
  Home,
  Network,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { LevelBadge } from "@/components/gamification/level-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentNavLinks } from "@/components/student-nav-links";
import { TabBar } from "@/components/tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";

/// Navegação do portal do aluno/egresso. Fonte única: o layout do grupo
/// `(aluno)` e a vitrine `/egressos` (que vive fora do grupo) consomem daqui,
/// para que o aluno não perca o menu ao entrar na vitrine.
export const STUDENT_NAV_ITEMS = [
  { href: "/painel", label: "Início", icon: Home },
  { href: "/arvore", label: "Árvore", icon: Network },
  { href: "/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/vagas", label: "Vagas", icon: Briefcase },
  { href: "/egressos", label: "Egressos", icon: GraduationCap },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

/// Chrome do portal (Fase 6): topo com nav desktop + badge de nível; TabBar
/// fixa no mobile (wireframe aprovado na Fase 5).
export function StudentChrome({
  level,
  levelTitle,
  children,
}: {
  level: number;
  levelTitle: string;
  children: React.ReactNode;
}) {
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
            items={STUDENT_NAV_ITEMS.map(({ href, label }) => ({
              href,
              label,
            }))}
          />
          <div className="ml-auto flex items-center gap-2">
            <LevelBadge
              level={level}
              title={levelTitle}
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
        items={STUDENT_NAV_ITEMS.map(({ href, label, icon: Icon }) => ({
          href,
          label,
          icon: <Icon className="size-4" aria-hidden />,
        }))}
      />
    </div>
  );
}
