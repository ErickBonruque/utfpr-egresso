import { RefreshCw } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSuperAdmin } from "@/lib/authz";
import { SYNC_STATUS_LABEL } from "@/lib/labels";
import { getAcademicProvider, readProviderName } from "@/server/academic";
import { requireAdmin } from "@/server/actor";
import { prisma } from "@/server/db";
import { triggerAcademicSync } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    SUCCESS: "default",
    RUNNING: "secondary",
    PARTIAL: "secondary",
    FAILED: "destructive",
  };

function duration(startedAt: Date, finishedAt: Date | null): string {
  if (!finishedAt) return "em andamento";
  const seconds = Math.max(
    0,
    Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
  );
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}min`;
}

/// Saúde da integração acadêmica (Fase 8): qual fonte está ativa e o que as
/// últimas execuções fizeram. O coordenador consegue responder "a integração
/// está viva?" sem abrir terminal nem banco.
export default async function AdminSyncPage() {
  const actor = await requireAdmin();
  const provider = getAcademicProvider(prisma);
  const providerName = readProviderName();
  const configured = provider.isConfigured();

  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl">Sincronização acadêmica</h1>
          <p className="text-muted-foreground text-sm">
            Situação, matrículas e notas entram no sistema por uma fonte só. A
            troca de fonte é configuração (<code>ACADEMIC_PROVIDER</code>), não
            mudança de tela.
          </p>
        </div>
        {isSuperAdmin(actor) && (
          <ConfirmButton
            action={triggerAcademicSync}
            variant="default"
            confirmMessage={`Sincronizar todos os alunos agora usando a fonte "${providerName}"? Dados da fonte sobrescrevem o espelho; nada é apagado.`}
          >
            <RefreshCw className="size-4" aria-hidden />
            Sincronizar agora
          </ConfirmButton>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
        <span className="text-sm">Fonte ativa:</span>
        <Badge variant="secondary" className="font-mono">
          {providerName}
        </Badge>
        {providerName === "seed" ? (
          <span className="text-muted-foreground text-sm">
            Dados sintéticos determinísticos — a integração com a UTFPR ainda
            não está ligada.
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {configured
              ? "Conexão configurada."
              : "Faltam variáveis de ambiente da conexão (UTFPR_DATABASE_URL)."}
          </span>
        )}
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma sincronização registrada"
          description="Cada execução, pela tela ou pela linha de comando, deixa um registro aqui com o que foi lido e escrito."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Matrículas</TableHead>
                <TableHead>Avisos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="whitespace-nowrap">
                    {run.startedAt.toLocaleString("pt-BR")}
                    <span className="block text-muted-foreground text-xs">
                      {duration(run.startedAt, run.finishedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {run.provider}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {run.triggeredBy === "admin"
                      ? "Painel"
                      : "Linha de comando"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"}>
                      {SYNC_STATUS_LABEL[run.status] ?? run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {run.studentsProcessed} ok
                    {run.studentsSkipped > 0 &&
                      ` · ${run.studentsSkipped} pulado(s)`}
                    {run.studentsFailed > 0 &&
                      ` · ${run.studentsFailed} erro(s)`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    +{run.enrollmentsCreated} · ~{run.enrollmentsUpdated}
                  </TableCell>
                  <TableCell className="max-w-80 text-muted-foreground text-xs">
                    <span className="line-clamp-2">{run.message ?? "—"}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
