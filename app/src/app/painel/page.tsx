import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireStudent } from "@/server/actor";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Cursando",
  LOCKED: "Matrícula trancada",
  DROPPED_OUT: "Desistente",
  GRADUATED: "Formado(a)",
};

export default async function PainelPage() {
  const actor = await requireStudent();
  // requireStudent guarantees actor.student — profileId is always loadable.
  const profile = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: actor.student?.profileId },
    include: {
      user: true,
      course: {
        include: {
          campus: true,
          _count: {
            select: { achievements: true, tracks: true, careers: true },
          },
        },
      },
      academicStanding: true,
      graduateProfile: true,
    },
  });

  const isGraduate = profile.graduateProfile !== null;
  const status = profile.academicStanding?.status;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-3xl">Olá, {profile.user.name}</h1>
          <p className="text-muted-foreground">
            {profile.course.name} · Campus {profile.course.campus.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">RA</p>
          <p className="font-medium">{profile.ra}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Situação</p>
          <p className="font-medium">
            {status ? (STATUS_LABEL[status] ?? status) : "Sem dados acadêmicos"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Ingresso</p>
          <p className="font-medium">{profile.admissionTerm ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Perfil</p>
          <p className="font-medium">
            {isGraduate ? "Egresso(a)" : "Aluno(a)"}
          </p>
        </div>
      </section>

      {isGraduate && (
        <p className="rounded-lg border border-success/50 bg-success/10 p-4 text-sm text-success">
          🎓 Você concluiu o curso! O espaço do egresso (vitrine, mentoria e
          conexões) chega na Fase 7.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-xl">Seu curso no CEA</h2>
        <p className="text-muted-foreground text-sm">
          {profile.course._count.achievements} conquistas,{" "}
          {profile.course._count.tracks} trilha(s) e{" "}
          {profile.course._count.careers} carreiras já configuradas — o seu
          progresso, XP e nível aparecem aqui a partir da Fase 5/6.
        </p>
      </section>
    </main>
  );
}
