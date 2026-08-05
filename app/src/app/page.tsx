import { GraduationCap, Network, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UtfprLogo } from "@/components/utfpr-logo";
import { isAdmin } from "@/lib/authz";
import { getActor } from "@/server/actor";

// Porta de entrada pública (Fase 10). Até aqui a `/` era a tela de depuração
// da Fase 2 — listava campi e disciplinas direto do banco, o que num deploy
// seria entregar o inventário da instituição a quem nem logou.
//
// Quem já tem sessão não fica na vitrine institucional: vai direto para o seu
// lugar, que é o comportamento esperado de quem volta ao site.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Network,
    title: "Trilhas de carreira",
    description:
      "A matriz curricular vira uma árvore navegável: o aluno vê o que já concluiu, o que está aberto e para onde cada caminho leva.",
  },
  {
    icon: Trophy,
    title: "Conquistas e progresso",
    description:
      "Marcos configurados por curso, desbloqueados a partir do histórico acadêmico real — sem lançamento manual.",
  },
  {
    icon: Users,
    title: "Vitrine de egressos",
    description:
      "Quem se formou mostra onde chegou e pode se oferecer para mentoria. Só aparece quem escolhe aparecer.",
  },
];

export default async function Home() {
  const actor = await getActor();
  if (actor) redirect(isAdmin(actor) ? "/admin" : "/painel");

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
          {/* Instituição primeiro, produto depois, separados por um filete: a
              UTFPR é a titular do sistema, o CEA é o que ela oferece. */}
          <div className="flex items-center gap-3">
            <UtfprLogo className="h-6 sm:h-7" />
            <span className="h-6 w-px bg-border" aria-hidden />
            <span className="rounded-md bg-brand px-2 py-0.5 font-heading font-semibold text-brand-foreground">
              CEA
            </span>
          </div>
          {/* "· UTFPR" saiu daqui: a logo ao lado já diz, e repetir empobrece. */}
          <span className="hidden text-muted-foreground text-sm sm:inline">
            Conexão Egresso-Aluno
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex max-w-2xl flex-col items-start gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-muted-foreground text-xs">
            <GraduationCap className="size-3.5" aria-hidden />
            Campus Santa Helena
          </span>
          <h1 className="font-heading font-semibold text-4xl leading-tight sm:text-5xl">
            O caminho do aluno até o egresso, no mesmo lugar.
          </h1>
          <p className="text-lg text-muted-foreground">
            O CEA acompanha a trajetória acadêmica pela própria matriz
            curricular, transforma o progresso em trilhas e conquistas e mantém
            a ponte com quem já se formou.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/login">Entrar com o RA</Link>
            </Button>
            <p className="text-muted-foreground text-sm">
              Alunos e egressos usam o RA; a administração entra por e-mail.
            </p>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <h2 className="font-medium">{title}</h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Assinatura institucional: é o ponto da página com espaço para a marca
          por extenso, e o lugar onde ela é convenção. O nome da universidade
          saiu do texto porque a arte ao lado passou a dizê-lo. */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:gap-8">
          <UtfprLogo variant="assinatura" className="h-12 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Campus Santa Helena. Não há cadastro público: as contas vêm dos
            registros acadêmicos da instituição.
          </p>
        </div>
      </footer>
    </>
  );
}
