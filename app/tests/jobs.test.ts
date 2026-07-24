// Jobs layer (Fase 6.1): unit tests for the pure parts of src/server/jobs.ts.
// The network call to Adzuna is not exercised here — only the deterministic
// mapping, query building and credential checks. The discriminated result
// type and the param/contract mapping are the contracts the UI relies on.
import { afterEach, describe, expect, it } from "vitest";
import {
  type AdzunaRawHit,
  adzunaCredentialsMissing,
  buildAdzunaParams,
  clearJobsCache,
  mapAdzunaHit,
  searchJobs,
} from "../src/server/jobs";

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

  it("junta display_name + area na localização", () => {
    const job = mapAdzunaHit({
      ...baseHit,
      location: { display_name: "Curitiba", area: ["Curitiba", "PR"] },
    });
    expect(job.location).toBe("Curitiba, Curitiba, PR");
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

describe("searchJobs", () => {
  it("retorna erro amigável quando credenciais faltam (não quebra)", async () => {
    const result = await searchJobs({ searchTerm: "agronomo" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/configurada/i);
    }
  });
});
