import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentChrome } from "@/components/student-chrome";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/authz";
import { requireActor } from "@/server/actor";
import { prisma } from "@/server/db";
import { getStudentProgress } from "@/server/student-progress";
import { GraduateSearch } from "./graduate-search";

export const dynamic = "force-dynamic";

/// Public-ish showcase of alumni (Fase 7). Restricted to logged-in users
/// (decision: Erick asked for logged-in only, not fully public). Shows every
/// graduate who opted into showInShowcase, with client-side search/filters.
export default async function EgressosPage() {
  const actor = await requireActor();

  // Opt-in alumni only. No course/campus scoping: the showcase is meant to
  // connect across the whole institution (filters happen client-side).
  const rows = await prisma.graduateProfile.findMany({
    where: { showInShowcase: true },
    select: {
      jobTitle: true,
      company: true,
      linkedinUrl: true,
      githubUrl: true,
      contactEmail: true,
      mentorshipAvailable: true,
      mentorshipAreas: true,
      graduatedTerm: true,
      studentProfile: {
        select: {
          bio: true,
          user: { select: { name: true } },
          course: {
            select: {
              name: true,
              campus: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const graduates = rows.map((g) => ({
    name: g.studentProfile.user.name,
    bio: g.studentProfile.bio,
    jobTitle: g.jobTitle,
    company: g.company,
    linkedinUrl: g.linkedinUrl,
    githubUrl: g.githubUrl,
    contactEmail: g.contactEmail,
    mentorshipAvailable: g.mentorshipAvailable,
    mentorshipAreas: g.mentorshipAreas,
    graduatedTerm: g.graduatedTerm,
    courseName: g.studentProfile.course.name,
    campusName: g.studentProfile.course.campus.name,
  }));

  // Distinct campus/course lists drive the filter dropdowns.
  const campi = Array.from(new Set(graduates.map((g) => g.campusName))).sort();
  const courses = Array.from(
    new Set(graduates.map((g) => g.courseName)),
  ).sort();

  const content = (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-3xl">Egressos</h1>
        <p className="text-muted-foreground">
          Conheça quem já se formou. Cada perfil aqui foi compartilhado pelo
          próprio egresso.
        </p>
      </header>

      {graduates.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum egresso na vitrine ainda"
          description="Quando egressos ativarem a opção de aparecer na vitrine, eles aparecem aqui."
        />
      ) : (
        <GraduateSearch graduates={graduates} campi={campi} courses={courses} />
      )}
    </>
  );

  // Alunos e egressos mantêm o chrome do portal (menu + TabBar) para não serem
  // "jogados para fora" ao abrir a vitrine. Admins visitam com header enxuto,
  // já que a navegação deles é o painel administrativo.
  if (actor.student && !isAdmin(actor)) {
    const progress = await getStudentProgress();
    return (
      <StudentChrome
        level={progress.xp.level.level}
        levelTitle={progress.xp.level.title}
      >
        {content}
      </StudentChrome>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
          <Link
            href={isAdmin(actor) ? "/admin" : "/painel"}
            className="rounded-md bg-brand px-2 py-0.5 font-heading font-semibold text-brand-foreground"
          >
            CEA
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 pb-24">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={isAdmin(actor) ? "/admin" : "/painel"}>← Voltar</Link>
        </Button>
        {content}
      </main>
    </div>
  );
}
