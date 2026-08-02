// Rotina de sincronização acadêmica (Fase 8).
//
// Varre os alunos cadastrados no CEA, pergunta o registro de cada um ao
// provider ativo e escreve o que mudou no espelho. Cada execução deixa uma
// linha em `sync_runs` — sem log de execução a integração vira caixa-preta no
// dia em que a UTFPR mudar uma coluna.
//
// Import-safe fora do Next (o script de CLI usa daqui): o cliente Prisma vem
// sempre por parâmetro, como em academic-standing.ts.

import { deriveGpa, planEnrollmentWrites } from "@/lib/academic-sync";
import type { PrismaClient } from "../../../generated/prisma/client";
import { applyAcademicStanding } from "../academic-standing";
import { logger } from "../logger";
import { type AcademicDataProvider, AcademicSourceError } from "./provider";

export type SyncOptions = {
  /// Limita a execução a RAs específicos (o botão do admin sincroniza tudo;
  /// a CLI aceita RAs para depurar um aluno).
  onlyRas?: string[];
  /// Quem disparou: "cli" | "admin".
  triggeredBy: string;
  triggeredByUserId?: string | null;
  /// Recebe o andamento (a CLI imprime; a tela do admin ignora).
  onProgress?: (line: string) => void;
};

export type SyncSummary = {
  runId: string;
  provider: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  studentsProcessed: number;
  studentsSkipped: number;
  studentsFailed: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  standingsUpdated: number;
  message: string | null;
};

/// Executa uma sincronização completa e devolve o resumo já persistido.
export async function runAcademicSync(
  db: PrismaClient,
  provider: AcademicDataProvider,
  options: SyncOptions,
): Promise<SyncSummary> {
  const log = options.onProgress ?? (() => {});

  const run = await db.syncRun.create({
    data: {
      provider: provider.name,
      status: "RUNNING",
      triggeredBy: options.triggeredBy,
      triggeredByUserId: options.triggeredByUserId ?? null,
    },
    select: { id: true },
  });

  const counters = {
    studentsProcessed: 0,
    studentsSkipped: 0,
    studentsFailed: 0,
    enrollmentsCreated: 0,
    enrollmentsUpdated: 0,
    standingsUpdated: 0,
  };
  const warnings: string[] = [];

  const finish = async (
    status: SyncSummary["status"],
    message: string | null,
  ): Promise<SyncSummary> => {
    await db.syncRun.update({
      where: { id: run.id },
      data: { ...counters, status, message, finishedAt: new Date() },
    });
    return {
      runId: run.id,
      provider: provider.name,
      status,
      ...counters,
      message,
    };
  };

  // Falta de configuração é erro da execução inteira, não de cada aluno.
  if (!provider.isConfigured()) {
    const message = `Provider "${provider.name}" não está configurado. Verifique as variáveis de ambiente da integração.`;
    log(message);
    return finish("FAILED", message);
  }

  const students = await db.studentProfile.findMany({
    where: options.onlyRas?.length
      ? { ra: { in: options.onlyRas } }
      : undefined,
    select: { id: true, ra: true, courseId: true },
    orderBy: { ra: "asc" },
  });
  log(
    `Sincronizando ${students.length} aluno(s) via provider "${provider.name}".`,
  );

  // Cache por curso: a tradução código → id da disciplina é a mesma para
  // todos os alunos do curso, e a varredura é sequencial.
  const subjectsByCourse = new Map<string, Map<string, string>>();
  const subjectIdsFor = async (
    courseId: string,
  ): Promise<Map<string, string>> => {
    const cached = subjectsByCourse.get(courseId);
    if (cached) return cached;
    const subjects = await db.subject.findMany({
      where: { courseId },
      select: { id: true, code: true },
    });
    const map = new Map(subjects.map((s) => [s.code, s.id]));
    subjectsByCourse.set(courseId, map);
    return map;
  };

  for (const student of students) {
    try {
      const record = await provider.fetchStudent(student.ra);
      if (record === null) {
        counters.studentsSkipped++;
        log(`  ${student.ra}: não encontrado na fonte — pulado.`);
        continue;
      }

      // ── Situação acadêmica ──────────────────────────────────────────────
      // Sempre pela porta única (Fase 3): é ela que dispara a transição
      // aluno → egresso quando o status vira GRADUATED.
      const mirror = await db.enrollment.findMany({
        where: { studentProfileId: student.id },
        select: {
          id: true,
          term: true,
          status: true,
          grade: true,
          attendance: true,
          subject: { select: { code: true } },
        },
      });

      const plan = planEnrollmentWrites(
        record.enrollments,
        mirror.map((e) => ({
          id: e.id,
          subjectCode: e.subject.code,
          term: e.term,
          status: e.status,
          grade: e.grade === null ? null : Number(e.grade),
          attendance: e.attendance === null ? null : Number(e.attendance),
        })),
        await subjectIdsFor(student.courseId),
      );

      for (const row of plan.toCreate) {
        await db.enrollment.create({
          data: {
            studentProfileId: student.id,
            subjectId: row.subjectId,
            term: row.term,
            status: row.status,
            grade: row.grade,
            attendance: row.attendance,
          },
        });
      }
      for (const row of plan.toUpdate) {
        await db.enrollment.update({
          where: { id: row.id },
          data: {
            status: row.status,
            grade: row.grade,
            attendance: row.attendance,
            syncedAt: new Date(),
          },
        });
      }

      // CR: o oficial da fonte quando existe; senão o derivado das notas que
      // acabaram de entrar (mesma regra do seed).
      await applyAcademicStanding(db, student.id, {
        status: record.standing.status,
        currentPeriod: record.standing.currentPeriod,
        gpa: record.standing.gpa ?? deriveGpa(record.enrollments),
        graduatedTerm: record.standing.graduatedTerm,
      });

      counters.studentsProcessed++;
      counters.standingsUpdated++;
      counters.enrollmentsCreated += plan.toCreate.length;
      counters.enrollmentsUpdated += plan.toUpdate.length;

      if (plan.unknownSubjectCodes.length > 0) {
        const warning = `${student.ra}: disciplinas fora da matriz cadastrada (${plan.unknownSubjectCodes.join(", ")})`;
        warnings.push(warning);
        log(`  ⚠ ${warning}`);
      }
      log(
        `  ${student.ra}: +${plan.toCreate.length} nova(s), ~${plan.toUpdate.length} atualizada(s), =${plan.unchanged} igual(is), ${plan.missingFromSource} preservada(s).`,
      );
    } catch (error) {
      counters.studentsFailed++;
      const detail =
        error instanceof AcademicSourceError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      warnings.push(`${student.ra}: ${detail}`);
      log(`  ✗ ${student.ra}: ${detail}`);
      logger.error("sync.student_failed", error, {
        ra: student.ra,
        provider: provider.name,
      });
    }
  }

  const status =
    counters.studentsFailed === 0
      ? "SUCCESS"
      : counters.studentsProcessed === 0
        ? "FAILED"
        : "PARTIAL";
  // O log guarda os primeiros avisos: o suficiente para diagnosticar sem
  // transformar a coluna num despejo de stack trace.
  const message =
    warnings.length === 0
      ? null
      : warnings.slice(0, 10).join(" · ") +
        (warnings.length > 10 ? ` · (+${warnings.length - 10})` : "");

  log(
    `Concluído: ${counters.studentsProcessed} sincronizado(s), ${counters.studentsSkipped} pulado(s), ${counters.studentsFailed} com erro.`,
  );
  return finish(status, message);
}
