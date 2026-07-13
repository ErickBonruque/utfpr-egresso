import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/authz";
import { getActor } from "@/server/actor";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const actor = await getActor();
  if (actor) redirect(isAdmin(actor) ? "/admin" : "/painel");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-semibold text-3xl">Entrar no CEA</h1>
        <p className="text-muted-foreground">
          Conexão Egresso-Aluno · UTFPR Santa Helena
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
