// Jobs search layer (Fase 6.1): isolates the external job source behind a
// single interface so the UI never knows whether results come from Adzuna,
// a future JobSpy sidecar or a UTFPR employability partnership. Mirrors the
// AcademicDataProvider pattern (Fase 8) and the engine isolation (Fase 6).
//
// Decision (Erick, 2026-07-24): Adzuna as primary source — stable contracted
// API with Brazil coverage, no Python in the deploy. Research record:
// .planning/research/fase6_1_fontes_vagas.md

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
  | { ok: true; jobs: JobResult[]; count: number }
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

export function mapAdzunaHit(hit: AdzunaRawHit): JobResult {
  const area = hit.location?.area ?? [];
  const locationLabel = [hit.location?.display_name, ...area]
    .filter(Boolean)
    .join(", ");
  return {
    id: String(
      hit.id ??
        hit.redirect_url ??
        `adzuna-${locationLabel}-${hit.title ?? ""}`,
    ),
    title: hit.title ?? "Vaga sem título",
    company: hit.company?.display_name ?? null,
    location: locationLabel || null,
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
    } catch {
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
    return {
      ok: true,
      jobs: hits.map(mapAdzunaHit),
      count: data.count ?? hits.length,
    };
  },
};

// ── Active provider + in-memory cache (per-request dedup + short TTL) ──────

const provider: JobsProvider = adzunaProvider;

type CacheEntry = { value: JobsResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(query: JobsQuery): string {
  return JSON.stringify({
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
  cache.set(key, { value: result, expiresAt: now + TTL_MS });
  return result;
}

/// Clears the jobs cache. Useful after config changes or for tests.
export function clearJobsCache(): void {
  cache.clear();
}
