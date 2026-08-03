import { Info } from "lucide-react";
import { environmentNotice, readEnvironmentKind } from "@/lib/environment";

/// Faixa fina no topo dizendo em que ambiente o usuário está (Fase 10).
/// Server component: lê a variável direto, sem mandar nada disso ao cliente.
/// Em produção não renderiza nada.
export function EnvironmentBanner() {
  const notice = environmentNotice(readEnvironmentKind(process.env));
  if (!notice) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-brand/40 border-b bg-brand/10 px-4 py-1.5 text-center text-xs">
      <Info
        className="size-3.5 shrink-0 text-brand-foreground/70"
        aria-hidden
      />
      <p>
        <span className="font-medium">{notice.label}</span>
        <span className="text-muted-foreground"> — {notice.message}</span>
      </p>
    </div>
  );
}
