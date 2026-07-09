import Link from "next/link";
import { CourseTabsNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { DEGREE_LABEL } from "@/lib/labels";
import { requireManageableCourse } from "@/server/admin-scope";

export const dynamic = "force-dynamic";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await requireManageableCourse(courseId);

  const base = `/admin/cursos/${course.id}`;
  const tabs = [
    { href: `${base}/disciplinas`, label: "Disciplinas" },
    { href: `${base}/conquistas`, label: "Conquistas" },
    { href: `${base}/trilhas`, label: "Trilhas" },
    { href: `${base}/carreiras`, label: "Carreiras" },
    { href: `${base}/niveis`, label: "Níveis" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/cursos"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Cursos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl">{course.name}</h1>
          <Badge variant="secondary">{DEGREE_LABEL[course.degree]}</Badge>
          <Badge variant="outline">
            {course.campus.name} ({course.campus.code})
          </Badge>
        </div>
      </div>
      <CourseTabsNav items={tabs} />
      {children}
    </div>
  );
}
