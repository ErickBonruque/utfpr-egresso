// CLI da sincronização acadêmica (Fase 8): `npm run sync:academic`.
//
// É o mesmo código que o botão do admin dispara — aqui só há o invólucro de
// linha de comando, para rodar na mão durante a virada ou por cron/agendador.
//
//   npm run sync:academic                  # todos os alunos
//   npm run sync:academic -- a2587246      # só esses RAs (depuração)
//   ACADEMIC_PROVIDER=utfpr npm run sync:academic
//
// Sai com código 1 quando a execução falha, para o agendador perceber.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getAcademicProvider, readProviderName } from "../src/server/academic";
import { runAcademicSync } from "../src/server/academic/sync";

async function main() {
  const onlyRas = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  // Mesmo arranjo do seed: fora do Next não existe o singleton de src/server/db.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  console.log(`Provider ativo: ${readProviderName()}`);
  if (onlyRas.length > 0) console.log(`RAs: ${onlyRas.join(", ")}`);

  try {
    const summary = await runAcademicSync(db, getAcademicProvider(db), {
      onlyRas,
      triggeredBy: "cli",
      onProgress: (line) => console.log(line),
    });

    console.log(`\nExecução ${summary.runId} — ${summary.status}`);
    if (summary.message) console.log(`Avisos: ${summary.message}`);
    if (summary.status === "FAILED") process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
