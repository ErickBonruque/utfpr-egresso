// Implementação 1 do AcademicDataProvider (Fase 8): a fonte sintética que
// sustenta o sistema enquanto a conexão com a UTFPR não existe.
//
// Não é um stub vazio: reproduz o mesmo histórico determinístico que o seed
// gera (`planMockEnrollments`), derivando-o do período de ingresso e da
// situação do aluno. Com isso a rotina de sincronização faz um ciclo real de
// ponta a ponta hoje — busca na "fonte", compara com o espelho, escreve o que
// mudou — e no dia da virada só o provider muda.

import { deriveGpa, type SourceAcademicRecord } from "@/lib/academic-sync";
import { planMockEnrollments } from "@/lib/mock-enrollments";
import type { PrismaClient } from "../../../generated/prisma/client";
import { type AcademicDataProvider, AcademicSourceError } from "./provider";

export function createSeedProvider(db: PrismaClient): AcademicDataProvider {
  return {
    name: "seed",

    isConfigured: () => true,

    async fetchStudent(ra: string): Promise<SourceAcademicRecord | null> {
      const profile = await db.studentProfile.findUnique({
        where: { ra },
        select: {
          courseId: true,
          admissionTerm: true,
          academicStanding: {
            select: { status: true, currentPeriod: true },
          },
          graduateProfile: { select: { graduatedTerm: true } },
        },
      });
      // A fonte sintética só sabe descrever quem tem período de ingresso — é
      // dele que o calendário do histórico é derivado. Sem ele, "não conheço
      // esse RA" é a resposta honesta (a execução conta como pulado).
      if (!profile || !profile.admissionTerm) return null;

      const curriculum = await db.curriculum.findFirst({
        where: { courseId: profile.courseId, isActive: true },
        select: {
          entries: {
            select: {
              period: true,
              isElective: true,
              subject: { select: { code: true } },
            },
          },
        },
      });
      if (!curriculum) {
        throw new AcademicSourceError(
          `Curso do aluno ${ra} não tem matriz curricular ativa — a fonte sintética deriva o histórico da matriz.`,
        );
      }

      const status = profile.academicStanding?.status ?? "ACTIVE";
      const graduated = status === "GRADUATED";

      const plan = planMockEnrollments({
        ra,
        admissionTerm: profile.admissionTerm,
        currentPeriod: profile.academicStanding?.currentPeriod ?? null,
        graduated,
        entries: curriculum.entries.map((e) => ({
          code: e.subject.code,
          period: e.period,
          isElective: e.isElective,
        })),
      });

      const enrollments = plan.map((p) => ({
        subjectCode: p.subjectCode,
        term: p.term,
        status: p.status,
        grade: p.grade,
        attendance: p.attendance,
      }));

      return {
        ra,
        standing: {
          status,
          currentPeriod: profile.academicStanding?.currentPeriod ?? null,
          gpa: deriveGpa(enrollments),
          graduatedTerm: profile.graduateProfile?.graduatedTerm ?? null,
        },
        enrollments,
      };
    },
  };
}
