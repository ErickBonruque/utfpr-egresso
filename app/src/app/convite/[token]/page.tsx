import Link from "next/link";
import { redirect } from "next/navigation";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/labels";
import { acceptInvite, getValidInvite } from "@/server/admin-invites";
import { prisma } from "@/server/db";
import { AcceptInviteForm } from "./accept-form";

export const dynamic = "force-dynamic";

async function acceptAction(
  token: string,
  formData: FormData,
): Promise<FormActionResult> {
  "use server";
  try {
    await acceptInvite(token, String(formData.get("password") ?? ""));
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível aceitar o convite.",
    };
  }
  redirect("/login");
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getValidInvite(token);

  if (!invite) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>
              Este convite não existe, expirou ou já foi utilizado. Peça um novo
              link a quem convidou você.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm underline">
              Ir para o login
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const scope = invite.campusId
    ? (
        await prisma.campus.findUnique({
          where: { id: invite.campusId },
          select: { name: true },
        })
      )?.name
    : invite.courseId
      ? (
          await prisma.course.findUnique({
            where: { id: invite.courseId },
            select: { name: true },
          })
        )?.name
      : "Todos os campi e cursos";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Convite — Sistema CEA</CardTitle>
          <CardDescription>
            {invite.createdBy.name} convidou {invite.name} ({invite.email}) para
            administrar a plataforma.
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">{ROLE_LABEL[invite.role]}</Badge>
            <Badge variant="outline">{scope ?? "—"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm action={acceptAction.bind(null, token)} />
        </CardContent>
      </Card>
    </main>
  );
}
