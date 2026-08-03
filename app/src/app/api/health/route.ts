import { NextResponse } from "next/server";
import { readEnvironmentKind } from "@/lib/environment";
import { prisma } from "@/server/db";
import { logger } from "@/server/logger";

// Sonda de saúde (Fase 10). Serve ao smoke test do deploy e a qualquer
// monitor externo: responde 200 só quando a aplicação **e** o banco estão de
// pé. Sem ela, "o site abriu" não distingue app saudável de app servindo
// erro em toda página por falta de banco.
//
// Pública de propósito (é o que um monitor consegue chamar), então não devolve
// nada que ajude um atacante: sem versão de dependência, sem host do banco,
// sem contagem de usuários.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    // Consulta trivial que percorre o caminho real (pool → driver → banco).
    await prisma.campus.count();
    return NextResponse.json({
      status: "ok",
      environment: readEnvironmentKind(process.env),
      database: "ok",
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error("health.database_unreachable", error);
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503 },
    );
  }
}
