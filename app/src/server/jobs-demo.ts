// Fonte de vagas de demonstração (Fase 6.1). Espelha o padrão do
// ACADEMIC_PROVIDER="seed" da Fase 8: quando a fonte externa não está
// disponível, o sistema degrada para dados sintéticos determinísticos em vez
// de mostrar tela de erro.
//
// Motivo de existir (Erick, 2026-08-05): a busca de vagas é o único ponto do
// CEA que depende de uma API de terceiros em tempo real. Numa apresentação ou
// gravação, uma queda ou estouro de cota da Adzuna derruba a demonstração
// inteira. Este provider garante que a tela sempre tenha o que mostrar.
//
// HONESTIDADE: toda vaga daqui sai com `source: "Demonstração"` e `url: "#"`.
// A UI usa isso para marcar o card e desabilitar o link — nenhuma vaga
// fictícia pode ser confundida com uma oportunidade real.

import { foldText, significantWords } from "@/lib/text";
import type { JobResult, JobsProvider, JobsQuery, JobsResult } from "./jobs";

export const DEMO_SOURCE = "Demonstração";

/// Vagas sintéticas cobrindo os três cursos do campus Santa Helena
/// (Ciência da Computação, Agronomia, Licenciatura em Ciências Biológicas).
/// `daysAgo` vira `postedAt` na hora da consulta, para que os resultados
/// nunca pareçam antigos numa demonstração feita meses depois.
type DemoJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  daysAgo: number;
  isRemote: boolean;
  contractType: "full_time" | "part_time" | "contract" | "permanent";
  salary: { min: number | null; max: number | null } | null;
  /// Termos extras que casam com a busca além de título/descrição.
  keywords: string[];
};

const DEMO_JOBS: DemoJob[] = [
  // ── Ciência da Computação ────────────────────────────────────────────────
  {
    id: "demo-cc-1",
    title: "Desenvolvedor(a) Back-end Júnior",
    company: "Softwaresul Informática",
    location: "Toledo, Paraná",
    description:
      "Vaga para atuar no desenvolvimento de APIs REST em Node.js e Python, integrações com bancos relacionais e manutenção de serviços em nuvem. Desejável conhecimento em Git e metodologias ágeis. Aberta a recém-formados.",
    daysAgo: 1,
    isRemote: false,
    contractType: "full_time",
    salary: { min: 3500, max: 5200 },
    keywords: ["backend", "programador", "node", "python", "api", "software"],
  },
  {
    id: "demo-cc-2",
    title: "Cientista de Dados",
    company: "Cooperativa Agroindustrial C.Vale",
    location: "Palotina, Paraná",
    description:
      "Análise de dados de produção agrícola, construção de modelos preditivos de safra e dashboards para a diretoria. Requisitos: Python (pandas, scikit-learn), SQL e estatística aplicada.",
    daysAgo: 3,
    isRemote: false,
    contractType: "full_time",
    salary: { min: 6000, max: 9000 },
    keywords: ["dados", "data science", "machine learning", "python", "sql"],
  },
  {
    id: "demo-cc-3",
    title: "Analista de Suporte e Infraestrutura",
    company: "Prefeitura Municipal de Santa Helena",
    location: "Santa Helena, Paraná",
    description:
      "Manutenção do parque de máquinas, administração de rede e suporte aos sistemas municipais. Contratação via processo seletivo simplificado.",
    daysAgo: 6,
    isRemote: false,
    contractType: "contract",
    salary: { min: 3200, max: null },
    keywords: ["suporte", "infraestrutura", "redes", "ti", "help desk"],
  },
  {
    id: "demo-cc-4",
    title: "Desenvolvedor(a) Front-end React (Remoto)",
    company: "Nuvem Digital Tecnologia",
    location: "Curitiba, Paraná",
    description:
      "Trabalho 100% remoto no desenvolvimento de interfaces com React e TypeScript. Buscamos pessoas com portfólio, mesmo sem experiência formal em carteira.",
    daysAgo: 2,
    isRemote: true,
    contractType: "full_time",
    salary: { min: 4500, max: 7000 },
    keywords: ["frontend", "react", "typescript", "web", "remoto"],
  },
  {
    id: "demo-cc-5",
    title: "Estágio em Desenvolvimento de Sistemas",
    company: "Biopark Educação",
    location: "Toledo, Paraná",
    description:
      "Estágio para estudantes a partir do 4º período. Atuação em projetos internos de automação e sistemas web, com acompanhamento de pessoa desenvolvedora sênior.",
    daysAgo: 4,
    isRemote: false,
    contractType: "part_time",
    salary: { min: 1200, max: null },
    keywords: ["estágio", "estagio", "trainee", "júnior", "sistemas"],
  },
  {
    id: "demo-cc-6",
    title: "Analista de Segurança da Informação",
    company: "Copel Telecomunicações",
    location: "Cascavel, Paraná",
    description:
      "Monitoramento de incidentes, gestão de vulnerabilidades e apoio à conformidade com a LGPD. Desejável certificação na área e experiência com SIEM.",
    daysAgo: 9,
    isRemote: false,
    contractType: "permanent",
    salary: { min: 7500, max: 11000 },
    keywords: ["segurança", "seguranca", "cibersegurança", "lgpd", "redes"],
  },

  // ── Agronomia ────────────────────────────────────────────────────────────
  {
    id: "demo-agro-1",
    title: "Engenheiro(a) Agrônomo(a) — Assistência Técnica",
    company: "Cooperativa Lar",
    location: "Medianeira, Paraná",
    description:
      "Acompanhamento técnico de lavouras de soja e milho, recomendação de manejo e relacionamento com cooperados da região oeste. Exige CREA ativo e CNH B.",
    daysAgo: 2,
    isRemote: false,
    contractType: "full_time",
    salary: { min: 6500, max: 9500 },
    keywords: ["agrônomo", "agronomo", "agronomia", "lavoura", "soja", "campo"],
  },
  {
    id: "demo-agro-2",
    title: "Consultor(a) Técnico em Agricultura de Precisão",
    company: "AgroSmart Soluções",
    location: "Santa Helena, Paraná",
    description:
      "Implantação de sensoriamento remoto, mapas de produtividade e taxa variável em propriedades da região. Interface direta entre agronomia e tecnologia.",
    daysAgo: 5,
    isRemote: false,
    contractType: "full_time",
    salary: { min: 5800, max: 8200 },
    keywords: [
      "agricultura de precisão",
      "agronomia",
      "geoprocessamento",
      "drone",
    ],
  },
  {
    id: "demo-agro-3",
    title: "Analista de Qualidade — Indústria de Alimentos",
    company: "Frimesa Cooperativa Central",
    location: "Marechal Cândido Rondon, Paraná",
    description:
      "Controle de qualidade de matéria-prima e produto acabado, APPCC e auditorias internas. Aberta a Agronomia, Ciências Biológicas e áreas afins.",
    daysAgo: 7,
    isRemote: false,
    contractType: "permanent",
    salary: { min: 4200, max: 6000 },
    keywords: ["qualidade", "alimentos", "appcc", "laboratório", "indústria"],
  },
  {
    id: "demo-agro-4",
    title: "Pesquisador(a) em Fitossanidade",
    company: "IDR-Paraná (Instituto de Desenvolvimento Rural)",
    location: "Londrina, Paraná",
    description:
      "Condução de experimentos de campo em manejo integrado de pragas e doenças, com publicação de resultados. Desejável mestrado na área.",
    daysAgo: 12,
    isRemote: false,
    contractType: "contract",
    salary: { min: 7000, max: null },
    keywords: [
      "pesquisa",
      "fitossanidade",
      "pragas",
      "agronomia",
      "experimento",
    ],
  },

  // ── Licenciatura em Ciências Biológicas ─────────────────────────────────
  {
    id: "demo-bio-1",
    title: "Professor(a) de Ciências e Biologia",
    company: "Colégio Estadual Santa Helena",
    location: "Santa Helena, Paraná",
    description:
      "Docência no ensino fundamental II e médio, em regime de contrato temporário (PSS). Exige licenciatura concluída ou em conclusão.",
    daysAgo: 3,
    isRemote: false,
    contractType: "contract",
    salary: { min: 3100, max: 4400 },
    keywords: [
      "professor",
      "docência",
      "docencia",
      "biologia",
      "ciências",
      "ensino",
      "licenciatura",
    ],
  },
  {
    id: "demo-bio-2",
    title: "Analista Ambiental Júnior",
    company: "Itaipu Binacional",
    location: "Foz do Iguaçu, Paraná",
    description:
      "Monitoramento de fauna e flora no entorno do reservatório, elaboração de relatórios técnicos e apoio a programas de educação ambiental.",
    daysAgo: 8,
    isRemote: false,
    contractType: "permanent",
    salary: { min: 5500, max: 8000 },
    keywords: [
      "ambiental",
      "meio ambiente",
      "biologia",
      "fauna",
      "licenciamento",
    ],
  },
  {
    id: "demo-bio-3",
    title: "Técnico(a) de Laboratório — Biologia Molecular",
    company: "Laboratório Central do Oeste",
    location: "Cascavel, Paraná",
    description:
      "Preparo de amostras, extração de DNA e operação de equipamentos de PCR. Formação em Ciências Biológicas ou Biomedicina.",
    daysAgo: 11,
    isRemote: false,
    contractType: "full_time",
    salary: { min: 3400, max: 4800 },
    keywords: ["laboratório", "laboratorio", "biologia", "pcr", "análises"],
  },
  {
    id: "demo-bio-4",
    title: "Educador(a) Ambiental (Meio Período)",
    company: "Parque Nacional do Iguaçu — Concessionária",
    location: "Foz do Iguaçu, Paraná",
    description:
      "Condução de trilhas interpretativas e oficinas para escolas visitantes. Ideal para licenciandos em Ciências Biológicas.",
    daysAgo: 5,
    isRemote: false,
    contractType: "part_time",
    salary: { min: 1900, max: 2600 },
    keywords: ["educação ambiental", "biologia", "trilha", "meio ambiente"],
  },

  // ── Multidisciplinares / remotas ────────────────────────────────────────
  {
    id: "demo-multi-1",
    title: "Analista de Projetos de Inovação (Remoto)",
    company: "Sistema FIEP",
    location: "Curitiba, Paraná",
    description:
      "Gestão de projetos de inovação com indústrias do Paraná, em modelo home office com viagens eventuais. Aberta a qualquer formação superior na área de exatas ou biológicas.",
    daysAgo: 4,
    isRemote: true,
    contractType: "full_time",
    salary: { min: 5000, max: 7500 },
    keywords: ["projetos", "inovação", "gestão", "remoto", "home office"],
  },
  {
    id: "demo-multi-2",
    title: "Bolsista de Iniciação Científica",
    company: "UTFPR — Campus Santa Helena",
    location: "Santa Helena, Paraná",
    description:
      "Bolsa de iniciação científica em projeto interdisciplinar de tecnologia aplicada ao agronegócio. Dedicação de 20h semanais.",
    daysAgo: 1,
    isRemote: false,
    contractType: "part_time",
    salary: { min: 700, max: null },
    keywords: ["iniciação científica", "bolsa", "pesquisa", "utfpr"],
  },
];

function matchesTerm(job: DemoJob, term: string): boolean {
  const haystack = foldText(
    [job.title, job.company, job.description, ...job.keywords].join(" "),
  );
  // Casa se QUALQUER palavra da busca aparecer — busca estreita demais numa
  // demonstração devolve lista vazia e passa a impressão de sistema quebrado.
  // Se nenhuma palavra for significativa, o termo inteiro vale como está:
  // quem busca "TI" ou "RH" quer resultado, não silêncio.
  const words = significantWords(term);
  if (words.length === 0) return haystack.includes(foldText(term));
  return words.some((word) => haystack.includes(word));
}

function toJobResult(job: DemoJob, now: number): JobResult {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    url: "#", // sem link: a vaga não existe fora da demonstração
    postedAt: new Date(now - job.daysAgo * 86_400_000),
    isRemote: job.isRemote,
    contractType: job.contractType,
    salary: job.salary
      ? { min: job.salary.min, max: job.salary.max, currency: "BRL" }
      : null,
    source: DEMO_SOURCE,
  };
}

export function searchDemoJobs(query: JobsQuery): JobResult[] {
  const now = Date.now();
  const term = query.searchTerm.trim();

  let hits = DEMO_JOBS.filter((job) => !term || matchesTerm(job, term));

  if (query.location?.trim()) {
    const where = foldText(query.location.trim());
    // "parana" casa com toda a lista; cidade específica estreita.
    const byPlace = hits.filter((job) =>
      foldText(job.location).includes(where),
    );
    // Local sem correspondência não zera o resultado: a demonstração continua
    // útil, e a UI já mostra a cidade real de cada vaga.
    if (byPlace.length > 0) hits = byPlace;
  }

  if (query.remoteOnly) hits = hits.filter((job) => job.isRemote);
  if (query.contractType)
    hits = hits.filter((job) => job.contractType === query.contractType);
  if (query.maxDaysOld && query.maxDaysOld > 0)
    hits = hits.filter((job) => job.daysAgo <= (query.maxDaysOld as number));

  const limit = Math.min(Math.max(query.resultsPerPage ?? 12, 1), 50);
  return hits
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .slice(0, limit)
    .map((job) => toJobResult(job, now));
}

export const demoProvider: JobsProvider = {
  async search(query: JobsQuery): Promise<JobsResult> {
    const jobs = searchDemoJobs(query);
    return { ok: true, jobs, count: jobs.length, source: DEMO_SOURCE };
  },
};
