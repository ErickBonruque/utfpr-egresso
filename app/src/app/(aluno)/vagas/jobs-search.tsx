"use client";

import { Briefcase, ExternalLink, Info, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Jobs search UI (Fase 6.1): exposes Adzuna's parameters to the student
// (termo, local, remoto, contrato, antiguidade) and renders the Fase 5
// loading/empty/error states. Calls /api/jobs which is gated to students.

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  url: string;
  postedAt: string | null;
  isRemote: boolean;
  contractType: string | null;
  salary: { min: number | null; max: number | null; currency: string } | null;
  source: string;
};

type Result =
  | {
      ok: true;
      jobs: Job[];
      count: number;
      source?: string;
      notice?: string;
    }
  | { ok: false; error: string };

/// Precisa bater com DEMO_SOURCE em src/server/jobs-demo.ts.
const DEMO_SOURCE = "Demonstração";

const CONTRACT_LABELS: Record<string, string> = {
  full_time: "Integral",
  part_time: "Meio período",
  contract: "Contrato",
  permanent: "Efetivo",
};

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return `há ${Math.floor(days / 30)} mês(es)`;
}

function salaryLabel(s: NonNullable<Job["salary"]>): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: s.currency,
      maximumFractionDigits: 0,
    }).format(v);
  if (s.min != null && s.max != null) return `${fmt(s.min)} – ${fmt(s.max)}`;
  if (s.min != null) return `a partir de ${fmt(s.min)}`;
  if (s.max != null) return `até ${fmt(s.max)}`;
  return "";
}

export function JobsSearch() {
  const [term, setTerm] = useState("");
  const [where, setWhere] = useState("");
  const [remote, setRemote] = useState(false);
  const [contract, setContract] = useState<string>("");
  const [days, setDays] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: term.trim() });
      if (where.trim()) params.set("where", where.trim());
      if (remote) params.set("remote", "1");
      if (contract) params.set("contract", contract);
      if (days) params.set("days", days);
      const res = await fetch(`/api/jobs?${params}`);
      const data = (await res.json()) as Result;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Não foi possível concluir a busca." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero de busca (espelha a POC core/templates/vagas.html) */}
      <form
        onSubmit={runSearch}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Cargo, área ou palavra-chave (ex.: agrônomo)"
              className="h-9 pl-8"
              aria-label="O que procurar"
            />
          </div>
          <div className="relative sm:w-56">
            <MapPin
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Cidade ou região"
              className="h-9 pl-8"
              aria-label="Localização"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            <Search className="size-4" aria-hidden />
            Buscar
          </Button>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setRemote((r) => !r)}
            aria-pressed={remote}
            className={`rounded-full border px-3 py-1 transition-colors ${
              remote
                ? "border-transparent bg-brand font-semibold text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Remoto
          </button>
          <Select
            value={contract}
            onValueChange={(v) => setContract(v === "any" ? "" : v)}
          >
            <SelectTrigger
              size="sm"
              className="w-40"
              aria-label="Tipo de contrato"
            >
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer contrato</SelectItem>
              <SelectItem value="full_time">Integral</SelectItem>
              <SelectItem value="part_time">Meio período</SelectItem>
              <SelectItem value="contract">Contrato</SelectItem>
              <SelectItem value="permanent">Efetivo</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={days}
            onValueChange={(v) => setDays(v === "any" ? "" : v)}
          >
            <SelectTrigger size="sm" className="w-40" aria-label="Antiguidade">
              <SelectValue placeholder="Publicadas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer data</SelectItem>
              <SelectItem value="1">Últimas 24h</SelectItem>
              <SelectItem value="7">Última semana</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      {/* Resultados */}
      {loading && <JobsSkeleton />}

      {!loading && result && !result.ok && (
        <ErrorState title="Busca indisponível" description={result.error} />
      )}

      {!loading && result?.ok && result.jobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Nenhuma vaga encontrada"
          description="Tente outros termos, amplie a região ou relaxe os filtros."
        />
      )}

      {!loading && result?.ok && result.jobs.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Degradação para a fonte de demonstração precisa ficar explícita:
              ninguém pode achar que está vendo oportunidade real. */}
          {result.notice && (
            <div className="flex items-start gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <p>{result.notice}</p>
            </div>
          )}
          <p className="text-muted-foreground text-sm">
            {result.count} vaga(s) encontrada(s)
          </p>
          <div className="flex flex-col gap-3">
            {result.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const salary = job.salary ? salaryLabel(job.salary) : null;
  const when = relativeTime(job.postedAt);
  // Vaga sintética não tem anúncio para abrir: o título vira texto e o botão
  // "Ver" some. Link morto seria pior que a ausência dele.
  const isDemo = job.source === DEMO_SOURCE || job.url === "#";
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {isDemo ? (
              <span className="font-semibold text-foreground">{job.title}</span>
            ) : (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:underline"
              >
                {job.title}
              </a>
            )}
            <p className="text-muted-foreground text-sm">
              {[job.company, job.location].filter(Boolean).join(" · ") ||
                "Empresa/local não informados"}
            </p>
          </div>
          {!isDemo && (
            <Button asChild variant="outline" size="sm">
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                Ver <ExternalLink className="size-3" aria-hidden />
              </a>
            </Button>
          )}
        </div>

        {job.description && (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {job.description.replace(/<[^>]*>/g, "")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {isDemo && <Badge variant="outline">Demonstração</Badge>}
          {job.isRemote && <Badge variant="secondary">Remoto</Badge>}
          {job.contractType && (
            <Badge variant="outline">
              {CONTRACT_LABELS[job.contractType] ?? job.contractType}
            </Badge>
          )}
          {salary && <Badge variant="ghost">{salary}</Badge>}
          {when && (
            <span className="ml-auto text-muted-foreground text-xs">
              {when}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function JobsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <Card key={i}>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
