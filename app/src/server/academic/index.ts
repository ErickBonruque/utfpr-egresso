// Ponto de entrada da camada de integração acadêmica (Fase 8).
//
// A troca de fonte é UMA variável de ambiente: `ACADEMIC_PROVIDER=utfpr`.
// Nenhuma tela, action ou engine sabe de onde o dado veio — todos leem o
// espelho (tabelas do CEA), que só esta camada escreve.

import type { PrismaClient } from "../../../generated/prisma/client";
import type { AcademicDataProvider } from "./provider";
import { createSeedProvider } from "./seed-provider";
import { createUtfprProvider } from "./utfpr-provider";

export type AcademicProviderName = "seed" | "utfpr";

export function readProviderName(): AcademicProviderName {
  return process.env.ACADEMIC_PROVIDER?.trim() === "utfpr" ? "utfpr" : "seed";
}

/// Resolve o provider ativo. `db` só é usado pelo provider sintético, que
/// deriva o histórico determinístico da matriz curricular do próprio CEA.
export function getAcademicProvider(db: PrismaClient): AcademicDataProvider {
  return readProviderName() === "utfpr"
    ? createUtfprProvider()
    : createSeedProvider(db);
}

export type { AcademicDataProvider } from "./provider";
export { AcademicSourceError } from "./provider";
