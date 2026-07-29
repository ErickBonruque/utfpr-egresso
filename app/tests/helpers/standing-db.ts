// Stub em memória das duas tabelas que a regra de transição toca. Vive fora
// dos arquivos *.test.ts porque o teste da regra (academic-standing) e o teste
// de ponta a ponta da transição aluno → egresso consomem o mesmo stub.
import type { StandingDb } from "../../src/server/academic-standing";

type Row = Record<string, unknown>;

export function fakeStandingDb() {
  const standings = new Map<string, Row>();
  const graduates = new Map<string, Row>();
  const db: StandingDb = {
    academicStanding: {
      upsert: async ({ where, update, create }) => {
        const key = where.studentProfileId;
        standings.set(
          key,
          standings.has(key) ? { ...standings.get(key), ...update } : create,
        );
        return standings.get(key);
      },
    },
    graduateProfile: {
      upsert: async ({ where, update, create }) => {
        const key = where.studentProfileId;
        graduates.set(
          key,
          graduates.has(key) ? { ...graduates.get(key), ...update } : create,
        );
        return graduates.get(key);
      },
    },
  };
  return { db, standings, graduates };
}
