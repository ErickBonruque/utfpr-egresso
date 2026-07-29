import { StudentChrome } from "@/components/student-chrome";
import { getStudentProgress } from "@/server/student-progress";

export const dynamic = "force-dynamic";

/// Student portal chrome (Fase 6). A montagem vive em `StudentChrome` porque a
/// vitrine `/egressos` (fora deste grupo de rotas) reaproveita o mesmo menu.
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const progress = await getStudentProgress();

  return (
    <StudentChrome
      level={progress.xp.level.level}
      levelTitle={progress.xp.level.title}
    >
      {children}
    </StudentChrome>
  );
}
