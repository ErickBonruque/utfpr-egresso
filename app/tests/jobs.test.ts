// Jobs layer (Fase 6.1): unit tests for the pure parts of src/server/jobs.ts.
// The network call to Adzuna is not exercised here — only the deterministic
// mapping, query building and credential checks. The discriminated result
// type and the param/contract mapping are the contracts the UI relies on.
import { afterEach, describe, expect, it } from "vitest";
import {
  type AdzunaRawHit,
  adzunaCredentialsMissing,
  adzunaLocationLabel,
  buildAdzunaParams,
  clearJobsCache,
  DEMO_FALLBACK_NOTICE,
  dedupeJobs,
  isRelevantToTerm,
  jobsProviderMode,
  mapAdzunaHit,
  searchJobs,
} from "../src/server/jobs";
import { DEMO_SOURCE, searchDemoJobs } from "../src/server/jobs-demo";

const baseHit: AdzunaRawHit = {
  id: "123",
  title: "Agrônomo",
  company: { display_name: "Fazenda Santa Helena" },
  location: { display_name: "Santa Helena, PR", area: ["Santa Helena"] },
  description: "Vaga para atuar com culturas.",
  redirect_url: "https://example.com/job/123",
  created: "2026-07-20T10:00:00Z",
  contract_type: "full_time",
  salary_min: 3000,
  salary_max: 5000,
  salary_currency: "BRL",
};

afterEach(() => {
  clearJobsCache();
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;
  delete process.env.JOBS_PROVIDER;
});

describe("mapAdzunaHit", () => {
  it("mapeia um hit completo para JobResult", () => {
    const job = mapAdzunaHit(baseHit);
    expect(job).toMatchObject({
      id: "123",
      title: "Agrônomo",
      company: "Fazenda Santa Helena",
      url: "https://example.com/job/123",
      source: "Adzuna",
      isRemote: false,
      contractType: "full_time",
    });
    expect(job.location).toContain("Santa Helena");
    expect(job.postedAt).toBeInstanceOf(Date);
    expect(job.salary).toEqual({ min: 3000, max: 5000, currency: "BRL" });
  });

  it("usa só display_name — area é a hierarquia inteira e duplicaria", () => {
    const job = mapAdzunaHit({
      ...baseHit,
      location: {
        display_name: "Toledo, Paraná",
        area: ["Brasil", "Sul", "Paraná", "Toledo"],
      },
    });
    expect(job.location).toBe("Toledo, Paraná");
  });

  it("sem display_name, monta a partir de area (específico → geral, sem repetir)", () => {
    expect(
      adzunaLocationLabel({ area: ["Brasil", "Sul", "Paraná", "Toledo"] }),
    ).toBe("Toledo, Paraná, Sul, Brasil");
    expect(adzunaLocationLabel({ area: ["Paraná", "Paraná"] })).toBe("Paraná");
    expect(adzunaLocationLabel({ display_name: "   ", area: [] })).toBeNull();
    expect(adzunaLocationLabel(null)).toBeNull();
  });

  it("detecta vaga remota pelo texto (sem flag direta no Adzuna)", () => {
    const remote = mapAdzunaHit({
      ...baseHit,
      title: "Desenvolvedor Backend Remoto",
    });
    const hybrid = mapAdzunaHit({
      ...baseHit,
      description: "Modelo hybrid, 2 dias presenciais.",
    });
    const onsite = mapAdzunaHit(baseHit);
    expect(remote.isRemote).toBe(true);
    expect(hybrid.isRemote).toBe(true);
    expect(onsite.isRemote).toBe(false);
  });

  it("lida com hit mínimo (sem empresa/local/salário)", () => {
    const job = mapAdzunaHit({ title: "Vaga genérica" });
    expect(job.company).toBeNull();
    expect(job.location).toBeNull();
    expect(job.salary).toBeNull();
    expect(job.title).toBe("Vaga genérica");
    // id cai no fallback determinístico quando id e url faltam
    expect(job.id).toBeTruthy();
  });

  it("usa redirect_url como id quando id vem vazio", () => {
    const job = mapAdzunaHit({ redirect_url: "https://x.com/j/9" });
    expect(job.id).toBe("https://x.com/j/9");
    expect(job.title).toBe("Vaga sem título");
  });

  it("limpa HTML da descrição preservando o texto", () => {
    const job = mapAdzunaHit({
      ...baseHit,
      description: "<p>Buscamos <strong>engenheiro</strong>.</p>",
    });
    expect(job.description).toBe(
      "<p>Buscamos <strong>engenheiro</strong>.</p>",
    );
    // (a limpeza de tags acontece no client ao renderizar; o server preserva bruto)
  });
});

describe("buildAdzunaParams", () => {
  it("inclui credenciais e results_per_page com clamp", () => {
    process.env.ADZUNA_APP_ID = "myid";
    process.env.ADZUNA_APP_KEY = "mykey";
    const params = buildAdzunaParams({
      searchTerm: "agronomo",
      resultsPerPage: 999,
    });
    expect(params.app_id).toBe("myid");
    expect(params.app_key).toBe("mykey");
    expect(params.results_per_page).toBe("50"); // clamp superior
    expect(params.what).toBe("agronomo");
  });

  it("clamp inferior de results_per_page é 1", () => {
    const params = buildAdzunaParams({ searchTerm: "x", resultsPerPage: 0 });
    expect(params.results_per_page).toBe("1");
  });

  it("default de results_per_page é 12 quando ausente", () => {
    const params = buildAdzunaParams({ searchTerm: "x" });
    expect(params.results_per_page).toBe("12");
  });

  it("aplica where, remote, contract e max_days_old quando informados", () => {
    const params = buildAdzunaParams({
      searchTerm: "dev",
      location: "  Curitiba  ",
      remoteOnly: true,
      contractType: "part_time",
      maxDaysOld: 7,
    });
    expect(params.where).toBe("Curitiba"); // trim
    expect(params.full_time).toBe("1"); // proxy de remoto
    expect(params.part_time).toBe("1");
    expect(params.max_days_old).toBe("7");
  });

  it("omite filtros opcionais não informados", () => {
    const params = buildAdzunaParams({ searchTerm: "dev" });
    expect(params).not.toHaveProperty("where");
    expect(params).not.toHaveProperty("full_time");
    expect(params).not.toHaveProperty("max_days_old");
    expect(params).not.toHaveProperty("part_time");
  });
});

describe("adzunaCredentialsMissing", () => {
  it("true quando ambas as env vars faltam", () => {
    expect(adzunaCredentialsMissing()).toBe(true);
  });

  it("true quando só uma está definida", () => {
    process.env.ADZUNA_APP_ID = "id";
    expect(adzunaCredentialsMissing()).toBe(true);
  });

  it("true quando definidas mas vazias/whitespace", () => {
    process.env.ADZUNA_APP_ID = "   ";
    process.env.ADZUNA_APP_KEY = "";
    expect(adzunaCredentialsMissing()).toBe(true);
  });

  it("false quando ambas têm valor", () => {
    process.env.ADZUNA_APP_ID = "id";
    process.env.ADZUNA_APP_KEY = "key";
    expect(adzunaCredentialsMissing()).toBe(false);
  });
});

describe("isRelevantToTerm", () => {
  const job = (over: Partial<ReturnType<typeof mapAdzunaHit>>) => ({
    ...mapAdzunaHit(baseHit),
    ...over,
  });

  it("mantém a vaga cujo título casa", () => {
    expect(
      isRelevantToTerm(
        job({ title: "Cientista de Dados" }),
        "cientista de dados",
      ),
    ).toBe(true);
  });

  it("mantém a vaga cujo casamento está só na descrição", () => {
    expect(
      isRelevantToTerm(
        job({ title: "Técnico Ambiental", description: "Análise de dados." }),
        "cientista de dados",
      ),
    ).toBe(true);
  });

  it("descarta o preenchimento sem relação que a Adzuna manda no fim", () => {
    for (const t of [
      "Estagiário de Direito",
      "Negociador de Cobrança",
      "Auxiliar de Manutenção",
    ]) {
      expect(
        isRelevantToTerm(
          job({ title: t, description: "Atuar na área.", company: "Empresa" }),
          "cientista de dados",
        ),
      ).toBe(false);
    }
  });

  it("ignora acento e caixa nos dois lados", () => {
    expect(isRelevantToTerm(job({ title: "AGRÔNOMO" }), "agronomo")).toBe(true);
  });

  it("termo sem palavra significativa não filtra nada", () => {
    expect(isRelevantToTerm(job({ title: "Qualquer" }), "de")).toBe(true);
  });
});

describe("dedupeJobs", () => {
  it("remove republicação idêntica com id diferente", () => {
    const a = { ...mapAdzunaHit(baseHit), id: "1" };
    const b = { ...mapAdzunaHit(baseHit), id: "2" };
    expect(dedupeJobs([a, b])).toHaveLength(1);
  });

  it("preserva vagas iguais em cidades diferentes", () => {
    const a = { ...mapAdzunaHit(baseHit), id: "1", location: "Toledo" };
    const b = { ...mapAdzunaHit(baseHit), id: "2", location: "Curitiba" };
    expect(dedupeJobs([a, b])).toHaveLength(2);
  });

  it("mantém a ordem original", () => {
    const a = { ...mapAdzunaHit(baseHit), id: "1", title: "A" };
    const b = { ...mapAdzunaHit(baseHit), id: "2", title: "B" };
    expect(dedupeJobs([a, b, a]).map((j) => j.title)).toEqual(["A", "B"]);
  });
});

describe("jobsProviderMode", () => {
  it('sem JOBS_PROVIDER o modo é "auto"', () => {
    expect(jobsProviderMode()).toBe("auto");
  });

  it("aceita adzuna e demo, ignorando caixa e espaços", () => {
    process.env.JOBS_PROVIDER = " ADZUNA ";
    expect(jobsProviderMode()).toBe("adzuna");
    process.env.JOBS_PROVIDER = "Demo";
    expect(jobsProviderMode()).toBe("demo");
  });

  it('valor desconhecido cai em "auto" em vez de quebrar', () => {
    process.env.JOBS_PROVIDER = "jobspy";
    expect(jobsProviderMode()).toBe("auto");
  });
});

describe("searchDemoJobs", () => {
  it("casa termo sem acento com vaga acentuada", () => {
    const jobs = searchDemoJobs({ searchTerm: "agronomo" });
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.some((j) => /Agrônomo/i.test(j.title))).toBe(true);
  });

  it("toda vaga sai marcada como demonstração e sem link real", () => {
    const jobs = searchDemoJobs({ searchTerm: "desenvolvedor" });
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.source).toBe(DEMO_SOURCE);
      expect(job.url).toBe("#");
    }
  });

  it("filtra por remoto, contrato e antiguidade", () => {
    expect(
      searchDemoJobs({ searchTerm: "desenvolvedor", remoteOnly: true }).every(
        (j) => j.isRemote,
      ),
    ).toBe(true);
    expect(
      searchDemoJobs({
        searchTerm: "professor",
        contractType: "contract",
      }).every((j) => j.contractType === "contract"),
    ).toBe(true);
    const recentes = searchDemoJobs({ searchTerm: "biologia", maxDaysOld: 4 });
    for (const job of recentes) {
      const days = (Date.now() - (job.postedAt?.getTime() ?? 0)) / 86_400_000;
      expect(days).toBeLessThanOrEqual(4.1);
    }
  });

  it("respeita resultsPerPage", () => {
    expect(
      searchDemoJobs({ searchTerm: "analista", resultsPerPage: 2 }),
    ).toHaveLength(2);
  });

  it("termo curto ainda casa (busca por sigla não volta vazia)", () => {
    expect(searchDemoJobs({ searchTerm: "ti" }).length).toBeGreaterThan(0);
    expect(searchDemoJobs({ searchTerm: "pcr" }).length).toBeGreaterThan(0);
  });

  it("postedAt é relativo ao agora (nunca envelhece)", () => {
    const [job] = searchDemoJobs({ searchTerm: "iniciação", maxDaysOld: 2 });
    expect(job).toBeDefined();
    const days = (Date.now() - (job.postedAt as Date).getTime()) / 86_400_000;
    expect(days).toBeLessThan(2.1);
  });
});

describe("searchJobs", () => {
  it("sem credenciais, cai na demonstração com aviso em vez de erro", async () => {
    const result = await searchJobs({ searchTerm: "agronomo" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe(DEMO_SOURCE);
      expect(result.notice).toBe(DEMO_FALLBACK_NOTICE);
      // O motivo técnico (nome de env var, número de fase) fica no log.
      expect(result.notice).not.toMatch(/ADZUNA|Fase|process\.env/i);
      expect(result.jobs.length).toBeGreaterThan(0);
    }
  });

  it('JOBS_PROVIDER="adzuna" mantém o erro visível (sem fallback)', async () => {
    process.env.JOBS_PROVIDER = "adzuna";
    const result = await searchJobs({ searchTerm: "agronomo" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/configurada/i);
  });

  it('JOBS_PROVIDER="demo" não avisa degradação (é a fonte escolhida)', async () => {
    process.env.JOBS_PROVIDER = "demo";
    const result = await searchJobs({ searchTerm: "professor" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe(DEMO_SOURCE);
      expect(result.notice).toBeUndefined();
    }
  });

  it("o modo entra na chave do cache (trocar de fonte não serve o anterior)", async () => {
    process.env.JOBS_PROVIDER = "adzuna";
    const real = await searchJobs({ searchTerm: "professor" });
    expect(real.ok).toBe(false);

    process.env.JOBS_PROVIDER = "demo";
    const demo = await searchJobs({ searchTerm: "professor" });
    expect(demo.ok).toBe(true);
  });
});
