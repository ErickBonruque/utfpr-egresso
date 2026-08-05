import { redirect } from "next/navigation";
import { UtfprLogo } from "@/components/utfpr-logo";
import { isAdmin } from "@/lib/authz";
import { getActor } from "@/server/actor";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const actor = await getActor();
  if (actor) redirect(isAdmin(actor) ? "/admin" : "/painel");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16">
      {/* A assinatura completa ancora a tela: é o momento em que o usuário
          entrega credencial, e ver de quem é o sistema antes de digitar a
          senha é o que se espera de um serviço institucional. */}
      <header className="flex flex-col items-center gap-6 text-center">
        <UtfprLogo variant="assinatura" className="h-12 sm:h-14" />
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-3xl">Entrar no CEA</h1>
          <p className="text-muted-foreground">
            Conexão Egresso-Aluno · Campus Santa Helena
          </p>
        </div>
      </header>
      <LoginForm />
    </main>
  );
}
