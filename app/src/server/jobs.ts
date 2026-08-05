// Jobs search layer (Fase 6.1): isolates the external job source behind a
// single interface so the UI never knows whether results come from Adzuna,
// a future JobSpy sidecar or a UTFPR employability partnership. Mirrors the
// AcademicDataProvider pattern (Fase 8) and the engine isolation (Fase 6).
//
// Decision (Erick, 2026-07-24): Adzuna as primary source — stable contracted
// API with Brazil coverage, no Python in the deploy. Research record:
// .planning/research/fase6_1_fontes_vagas.md

import { foldText, significantWords } from "@/lib/text";
import { demoProvider } from "./jobs-demo";
import { logger } from "./logger";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/br/search";

export type JobResult = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  url: string;
  postedAt: Date | null;
  isRemote: boolean;
  contractType: string | null;
  salary: { min: number | null; max: number | null; currency: string } | null;
  source: string;
};

export type JobsQuery = {
  searchTerm: string;
  location?: string;
  remoteOnly?: boolean;
  /// Adzuna contract filters: full_time | part_time | contract | permanent
  contractType?: "full_time" | "part_time" | "contract" | "permanent" | null;
  /// Only postings from the last N days.
  maxDaysOld?: number;
  resultsPerPage?: number;
};

export type JobsResult =
  | {
      ok: true;
      jobs: JobResult[];
      count: number;
      /// Qual provider respondeu. A UI avisa o usuário quando não é a fonte
      /// real — ver `DEMO_SOURCE` em jobs-demo.ts.
      source?: string;
      /// Explicação a mostrar quando houve degradação (ex.: Adzuna fora do ar).
      notice?: string;
    }
  | { ok: false; error: string };

export interface JobsProvider {
  search(query: JobsQuery): Promise<JobsResult>;
}

// ── Adzuna provider ────────────────────────────────────────────────────────

export type AdzunaRawHit = {
  id?: string;
  title?: string;
  company?: { display_name?: string } | null;
  location?: { display_name?: string; area?: string[] } | null;
  description?: string;
  redirect_url?: string;
  created?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
};

export function adzunaCredentialsMissing(): boolean {
  return (
    !process.env.ADZUNA_APP_ID?.trim() || !process.env.ADZUNA_APP_KEY?.trim()
  );
}

export function buildAdzunaParams(query: JobsQuery): Record<string, string> {
  const params: Record<string, string> = {
    app_id: process.env.ADZUNA_APP_ID ?? "",
    app_key: process.env.ADZUNA_APP_KEY ?? "",
    results_per_page: String(
      Math.min(Math.max(query.resultsPerPage ?? 12, 1), 50),
    ),
  };
  if (query.searchTerm.trim()) params.what = query.searchTerm.trim();
  if (query.location?.trim()) params.where = query.location.trim();
  if (query.remoteOnly) params.full_time = "1"; // Adzuna has no remote flag; full_time is the closest proxy
  if (query.contractType) params[query.contractType] = "1";
  if (query.maxDaysOld && query.maxDaysOld > 0)
    params.max_days_old = String(query.maxDaysOld);
  return params;
}

/// A Adzuna manda `display_name` ("Toledo, Paraná") E `area`, que é a
/// hierarquia inteira ["Brasil","Sul","Paraná","Toledo"]. Concatenar os dois
/// produzia "Toledo, Paraná, Brasil, Sul, Paraná, Toledo" em todo card.
/// `display_name` já é a forma legível; `area` só entra quando ele falta, e
/// aí do mais específico para o mais geral, sem repetir termo.
export function adzunaLocationLabel(
  location: AdzunaRawHit["location"],
): string | null {
  const displayName = location?.display_name?.trim();
  if (displayName) return displayName;

  const area = (location?.area ?? []).map((a) => a.trim()).filter(Boolean);
  if (area.length === 0) return null;

  const seen = new Set<string>();
  return (
    [...area]
      .reverse()
      .filter((a) => {
        const key = a.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(", ") || null
  );
}

export function mapAdzunaHit(hit: AdzunaRawHit): JobResult {
  const locationLabel = adzunaLocationLabel(hit.location);
  return {
    id: String(
      hit.id ??
        hit.redirect_url ??
        `adzuna-${locationLabel}-${hit.title ?? ""}`,
    ),
    title: hit.title ?? "Vaga sem título",
    company: hit.company?.display_name ?? null,
    location: locationLabel,
    description: hit.description ?? null,
    url: hit.redirect_url ?? "#",
    postedAt: hit.created ? new Date(hit.created) : null,
    isRemote: /remot|home office|hybrid/i.test(
      `${hit.title ?? ""} ${hit.description ?? ""} ${hit.location?.display_name ?? ""}`,
    ),
    contractType: hit.contract_type ?? null,
    salary:
      hit.salary_min != null || hit.salary_max != null
        ? {
            min: hit.salary_min ?? null,
            max: hit.salary_max ?? null,
            currency: hit.salary_currency ?? "BRL",
          }
        : null,
    source: "Adzuna",
  };
}

/// A Adzuna completa a página com vagas sem relação nenhuma depois de esgotar
/// as que realmente casam: buscar "cientista de dados" devolvia "Estagiário de
/// Direito" e "Negociador de Cobrança" nas últimas posições. Nem `what_and`
/// nem `what_phrase` mudam isso (medido em 2026-08-05 — os três parâmetros
/// retornam a mesma lista). Então a relevância é conferida aqui.
///
/// O critério é deliberadamente frouxo: basta UMA palavra significativa da
/// busca aparecer no título, na descrição ou na empresa. Isso corta o ruído
/// evidente sem descartar a vaga cujo título não repete o termo procurado
/// (buscar "python" e achar "Desenvolvedor Back-end" continua funcionando).
export function isRelevantToTerm(job: JobResult, searchTerm: string): boolean {
  const words = significantWords(searchTerm);
  if (words.length === 0) return true; // termo curto demais: não filtra nada

  const haystack = foldText(
    [job.title, job.description, job.company].filter(Boolean).join(" "),
  );
  return words.some((word) => haystack.includes(word));
}

/// A mesma vaga reaparece na lista quando a empresa republica o anúncio — ids
/// diferentes, conteúdo idêntico. Numa tela de demonstração isso lê como bug.
export function dedupeJobs(jobs: JobResult[]): JobResult[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = foldText(
      [job.title, job.company ?? "", job.location ?? ""].join("|"),
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const adzunaProvider: JobsProvider = {
  async search(query: JobsQuery): Promise<JobsResult> {
    if (adzunaCredentialsMissing()) {
      return {
        ok: false,
        error:
          "Fonte de vagas não configurada. Defina ADZUNA_APP_ID e ADZUNA_APP_KEY no ambiente (Fase 6.1).",
      };
    }
    const params = buildAdzunaParams(query);
    const url = new URL(`${ADZUNA_BASE}/1`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let res: Response;
    try {
      res = await fetch(url, {
        // Cache Adzuna responses for ~5min to avoid hammering the API on
        // repeated identical searches during a session (Fase 6.1 requirement).
        next: { revalidate: 300 },
      });
    } catch (error) {
      logger.error("jobs.fetch_failed", error, { provider: "adzuna" });
      return { ok: false, error: "Falha de conexão com a fonte de vagas." };
    }

    if (res.status === 429) {
      return {
        ok: false,
        error: "Limite de buscas atingido. Tente em instantes.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `Fonte de vagas indisponível (HTTP ${res.status}).`,
      };
    }

    const data = (await res.json()) as {
      results?: AdzunaRawHit[];
      count?: number;
    };
    const hits = data.results ?? [];
    const jobs = dedupeJobs(
      hits
        .map(mapAdzunaHit)
        .filter((job) => isRelevantToTerm(job, query.searchTerm)),
    );
    return {
      ok: true,
      jobs,
      // `count` é o que está na tela, não o total bruto da Adzuna: dizer
      // "31 vagas" e listar 12 (das quais 5 eram ruído) confunde o aluno.
      count: jobs.length,
      source: "Adzuna",
    };
  },
};

// ── Seleção do provider ────────────────────────────────────────────────────
//
// JOBS_PROVIDER controla a fonte (Erick, 2026-08-05):
//   "auto" (padrão) — Adzuna; se ela falhar por qualquer motivo (sem chave,
//                     rede, cota, HTTP 5xx), cai no provider de demonstração
//                     em vez de mostrar tela de erro.
//   "adzuna"        — só a fonte real; erros aparecem como erro. Use quando o
//                     ponto é justamente diagnosticar a integração.
//   "demo"          — só dados sintéticos. Sem chamada externa.

export type JobsProviderMode = "auto" | "adzuna" | "demo";

export function jobsProviderMode(): JobsProviderMode {
  const raw = process.env.JOBS_PROVIDER?.trim().toLowerCase();
  return raw === "adzuna" || raw === "demo" ? raw : "auto";
}

/// Provider composto: aplica a política do modo acima. Resolve o modo a cada
/// chamada (e não no import) para que mudar o ambiente não exija rebuild.
export const resolvedProvider: JobsProvider = {
  async search(query: JobsQuery): Promise<JobsResult> {
    const mode = jobsProviderMode();
    if (mode === "demo") return demoProvider.search(query);
    if (mode === "adzuna") return adzunaProvider.search(query);

    const real = await adzunaProvider.search(query);
    if (real.ok) return real;

    logger.warn("jobs.fallback_to_demo", { reason: real.error });
    const demo = await demoProvider.search(query);
    return demo.ok
      ? {
          ...demo,
          notice: `Fonte externa indisponível (${real.error}) — exibindo vagas de demonstração.`,
        }
      : demo;
  },
};

// ── Cache em memória (dedup por consulta + TTL curto) ──────────────────────

const provider: JobsProvider = resolvedProvider;

type CacheEntry = { value: JobsResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes
/// Resposta degradada vale menos tempo: se a Adzuna voltar, não faz sentido
/// insistir na demonstração por cinco minutos. Mas também não pode ser zero,
/// senão cada busca vira uma tentativa nova contra uma API que está fora.
const DEGRADED_TTL_MS = 60 * 1000;

function cacheKey(query: JobsQuery): string {
  return JSON.stringify({
    // O modo entra na chave: trocar JOBS_PROVIDER não pode servir o resultado
    // cacheado do provider anterior.
    p: jobsProviderMode(),
    s: query.searchTerm.trim().toLowerCase(),
    l: query.location?.trim().toLowerCase(),
    r: query.remoteOnly,
    c: query.contractType,
    d: query.maxDaysOld,
    n: query.resultsPerPage,
  });
}

/// Search jobs via the active provider, with a short in-memory cache so the
/// same query inside a session doesn't repeat the external call.
export async function searchJobs(query: JobsQuery): Promise<JobsResult> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const result = await provider.search(query);
  const degraded = !result.ok || Boolean(result.notice);
  cache.set(key, {
    value: result,
    expiresAt: now + (degraded ? DEGRADED_TTL_MS : TTL_MS),
  });
  return result;
}

/// Clears the jobs cache. Useful after config changes or for tests.
export function clearJobsCache(): void {
  cache.clear();
}
