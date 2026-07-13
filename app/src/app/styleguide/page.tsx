import { Award, Home, Inbox, Network, Trophy, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpBar } from "@/components/gamification/xp-bar";
import { TabBar } from "@/components/tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CareerTreeDemo } from "./career-tree-demo";
import { ToastDemo } from "./toast-demo";

export const metadata: Metadata = { title: "Styleguide · CEA" };

const TOKEN_SWATCHES: { label: string; className: string }[] = [
  { label: "brand", className: "bg-brand" },
  { label: "primary", className: "bg-primary" },
  { label: "background", className: "border bg-background" },
  { label: "card", className: "border bg-card" },
  { label: "secondary", className: "bg-secondary" },
  { label: "muted", className: "bg-muted" },
  { label: "accent", className: "bg-accent" },
  { label: "success", className: "bg-success" },
  { label: "destructive", className: "bg-destructive" },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-b pb-2">
        <h2 className="font-semibold text-xl">{title}</h2>
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/// Showcase interno do design system (Fase 5). Só em desenvolvimento —
/// não é uma página do produto.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-3xl">Styleguide CEA</h1>
          <p className="text-muted-foreground">
            Tokens e componentes da Fase 5 — identidade UTFPR (Pantone 7406 C +
            Process Black C), Jost nos títulos, Geist no corpo.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section
        title="Cores"
        note="Amarelo é acento (navegação ativa, XP, conquistas, focus) — nunca fundo de página nem alerta."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {TOKEN_SWATCHES.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <div className={`h-14 rounded-lg ${s.className}`} />
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Tipografia"
        note="Títulos: Jost · Corpo: Geist · Dados: Geist Mono"
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-4xl">Título h1 — Jost</h1>
          <h2 className="font-semibold text-2xl">Título h2 — Jost</h2>
          <h3 className="font-medium text-lg">Título h3 — Jost</h3>
          <p className="max-w-prose">
            Corpo de texto em Geist. A plataforma CEA conecta alunos e egressos
            da UTFPR por meio de trilhas de carreira, conquistas e mentoria.
          </p>
          <p className="font-mono text-muted-foreground text-sm tabular-nums">
            mono/tabular: RA 2026001234 · CR 8,7 · 2.450 XP
          </p>
        </div>
      </Section>

      <Section title="Botões e badges">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Excluir</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secundária</Badge>
          <Badge variant="outline">Outline</Badge>
          <LevelBadge level={7} title="Veterano" />
        </div>
      </Section>

      <Section title="Formulário">
        <div className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sg-name">Nome da conquista</Label>
            <Input id="sg-name" placeholder="Mestre dos Algoritmos" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sg-check" />
            <Label htmlFor="sg-check">Visível para os alunos</Label>
          </div>
        </div>
      </Section>

      <Section
        title="Gamificação"
        note="XP e progresso sempre em amarelo; conquistas bloqueadas ficam visíveis com critério legível."
      >
        <div className="max-w-md">
          <XpBar totalXp={2450} levelMinXp={2000} nextLevelMinXp={3000} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AchievementCard
            name="Mestre dos Algoritmos"
            description="Aprovado em todas as disciplinas de algoritmos."
            icon="trophy"
            xp={150}
            category="Acadêmica"
            state="unlocked"
          />
          <AchievementCard
            name="Meio Caminho"
            description="Conclua 50% da carga horária do curso."
            icon="flag"
            xp={200}
            category="Acadêmica"
            state="in-progress"
            progress={72}
          />
          <AchievementCard
            name="Poliglota"
            description="Aprovado em 3 disciplinas de linguagens diferentes."
            icon="puzzle"
            xp={100}
            category="Carreira"
            state="locked"
          />
        </div>
      </Section>

      <Section
        title="Árvore de carreiras"
        note="React Flow + dagre — clique num nó para abrir o painel de detalhes."
      >
        <CareerTreeDemo />
      </Section>

      <Section
        title="Estados"
        note="EmptyState / Skeleton / ErrorState — reutilizados em todas as telas, nunca improvisados."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState
            icon={Award}
            title="Nenhuma conquista ainda"
            description="Complete disciplinas para desbloquear as primeiras."
            action={<Button size="sm">Ver árvore de carreiras</Button>}
          />
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <ErrorState />
        </div>
        <EmptyState
          icon={Inbox}
          title="Sem alunos neste curso"
          description="Importe a matriz curricular e vincule os alunos pelo painel."
        />
      </Section>

      <Section
        title="Navegação mobile"
        note="Tab bar inferior do portal do aluno (Fase 6 instancia com as rotas reais; aba ativa leva o indicador amarelo)."
      >
        <div className="max-w-sm overflow-hidden rounded-xl border">
          <div className="h-24 bg-muted/40" />
          <TabBar
            items={[
              {
                href: "/painel",
                label: "Início",
                icon: <Home className="size-4" aria-hidden />,
              },
              {
                href: "/arvore",
                label: "Árvore",
                icon: <Network className="size-4" aria-hidden />,
              },
              {
                href: "/conquistas",
                label: "Conquistas",
                icon: <Trophy className="size-4" aria-hidden />,
              },
              {
                href: "/perfil",
                label: "Perfil",
                icon: <UserRound className="size-4" aria-hidden />,
              },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Feedback"
        note="Toasts (sonner) substituem alert(); exclusões confirmam via AlertDialog."
      >
        <ToastDemo />
      </Section>
    </main>
  );
}
