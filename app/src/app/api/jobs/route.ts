import { type NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/server/actor";
import { type JobsQuery, searchJobs } from "@/server/jobs";

// Jobs search endpoint (Fase 6.1): proxies the active JobsProvider for the
// student portal form. Auth-gated to students (the /vagas page lives in the
// (aluno) group). Returns a discriminated JSON envelope so the client can
// render ErrorState on failure without a thrown fetch.

export const dynamic = "force-dynamic";

const CONTRACT_TYPES = new Set([
  "full_time",
  "part_time",
  "contract",
  "permanent",
]);

export async function GET(req: NextRequest) {
  const actor = await requireStudent();
  if (!actor.student) {
    return NextResponse.json(
      { ok: false, error: "Não autorizado." },
      { status: 403 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const searchTerm = sp.get("q")?.trim() ?? "";
  if (!searchTerm) {
    return NextResponse.json(
      { ok: false, error: "Informe o que procurar." },
      { status: 400 },
    );
  }

  const contractTypeParam = sp.get("contract");
  const query: JobsQuery = {
    searchTerm,
    location: sp.get("where")?.trim() || undefined,
    remoteOnly: sp.get("remote") === "1",
    contractType:
      contractTypeParam && CONTRACT_TYPES.has(contractTypeParam)
        ? (contractTypeParam as JobsQuery["contractType"])
        : null,
    maxDaysOld: sp.has("days")
      ? Math.min(Math.max(Number(sp.get("days")) || 0, 0), 60)
      : undefined,
    resultsPerPage: Math.min(Math.max(Number(sp.get("n")) || 12, 1), 24),
  };

  const result = await searchJobs(query);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
