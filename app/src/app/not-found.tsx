import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// 404 padrão (Fase 9). Server component: não há erro a reportar, só rota
// inexistente — e o usuário logado costuma chegar aqui por link velho.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Compass className="size-6" aria-hidden />
      </span>
      <h1 className="font-semibold text-2xl">Página não encontrada</h1>
      <p className="text-muted-foreground">
        O endereço acessado não existe ou foi movido.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/painel">Ir para o painel</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </main>
  );
}
