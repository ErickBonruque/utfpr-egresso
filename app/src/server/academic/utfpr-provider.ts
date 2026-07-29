// Implementação 2 do AcademicDataProvider (Fase 8): a conexão real com a
// UTFPR. Escrito para o cenário de **view SQL read-only** (decisão do Erick,
// 2026-07-29) — o arranjo mais comum quando a universidade libera acesso:
// um usuário só-leitura enxergando duas views no banco acadêmico.
//
// ⚠️ ESTE ARQUIVO NÃO CONECTA EM NADA AINDA. O que já está pronto é a parte
// que costuma dar trabalho: a normalização do que a view devolve para o
// contrato do CEA (`SourceAcademicRecord`) — códigos de situação, escala de
// nota, formato de período letivo. Essas funções são puras e têm teste
// (tests/utfpr-provider.test.ts). No dia da conexão sobra ligar o driver.
//
// Passo a passo da virada: .planning/decisions/FASE_8_INTEGRACAO_UTFPR.md

import {
  deriveGpa,
  type SourceAcademicRecord,
  type SourceEnrollment,
  type SourceStanding,
} from "@/lib/academic-sync";
import type {
  AcademicStatus,
  EnrollmentStatus,
} from "../../../generated/prisma/client";
import { type AcademicDataProvider, AcademicSourceError } from "./provider";

// ── Configuração ───────────────────────────────────────────────────────────

/// Tudo que a virada precisa vem de ambiente — nada hardcoded, para trocar de
/// homologação para produção sem recompilar.
export type UtfprConfig = {
  /// postgres://usuario_leitura:senha@host:5432/academico
  databaseUrl: string;
  /// Nome qualificado da view de situação (default: `cea_aluno`).
  studentView: string;
  /// Nome qualificado da view de matrículas (default: `cea_matricula`).
  enrollmentView: string;
};

export function readUtfprConfig(): UtfprConfig | null {
  const databaseUrl = process.env.UTFPR_DATABASE_URL?.trim();
  if (!databaseUrl) return null;
  return {
    databaseUrl,
    studentView: process.env.UTFPR_STUDENT_VIEW?.trim() || "cea_aluno",
    enrollmentView:
      process.env.UTFPR_ENROLLMENT_VIEW?.trim() || "cea_matricula",
  };
}

// ── Normalização (pronta e testada) ────────────────────────────────────────

/// Situação do aluno. As chaves são os rótulos que aparecem nos sistemas da
/// UTFPR; a lista cresce conforme a view real for conhecida — o default
/// conservador é ACTIVE, nunca GRADUATED (formar alguém por engano criaria um
/// GraduateProfile indevido, e a transição não é desfeita).
const STANDING_BY_SOURCE: Record<string, AcademicStatus> = {
  ATIVO: "ACTIVE",
  MATRICULADO: "ACTIVE",
  CURSANDO: "ACTIVE",
  TRANCADO: "LOCKED",
  TRANCAMENTO: "LOCKED",
  EVADIDO: "DROPPED_OUT",
  DESISTENTE: "DROPPED_OUT",
  CANCELADO: "DROPPED_OUT",
  JUBILADO: "DROPPED_OUT",
  FORMADO: "GRADUATED",
  CONCLUIDO: "GRADUATED",
  GRADUADO: "GRADUATED",
};

export function mapStandingStatus(raw: string | null | undefined): {
  status: AcademicStatus;
  recognized: boolean;
} {
  const key = normalizeLabel(raw);
  const status = STANDING_BY_SOURCE[key];
  return status
    ? { status, recognized: true }
    : { status: "ACTIVE", recognized: false };
}

/// Situação da matrícula. Idem: default conservador é IN_PROGRESS, porque
/// APPROVED alimenta conquistas e árvore — inventar aprovação corromperia a
/// gamificação de forma silenciosa.
const ENROLLMENT_BY_SOURCE: Record<string, EnrollmentStatus> = {
  APROVADO: "APPROVED",
  "APROVADO POR NOTA": "APPROVED",
  "APROVADO POR CONCEITO": "APPROVED",
  DISPENSADO: "APPROVED",
  APROVEITAMENTO: "APPROVED",
  REPROVADO: "FAILED",
  "REPROVADO POR NOTA": "FAILED",
  "REPROVADO POR FALTA": "FAILED",
  "REPROVADO POR FREQUENCIA": "FAILED",
  MATRICULADO: "IN_PROGRESS",
  CURSANDO: "IN_PROGRESS",
  "EM CURSO": "IN_PROGRESS",
  CANCELADO: "WITHDRAWN",
  TRANCADO: "WITHDRAWN",
  DESISTENCIA: "WITHDRAWN",
};

export function mapEnrollmentStatus(raw: string | null | undefined): {
  status: EnrollmentStatus;
  recognized: boolean;
} {
  const key = normalizeLabel(raw);
  const status = ENROLLMENT_BY_SOURCE[key];
  return status
    ? { status, recognized: true }
    : { status: "IN_PROGRESS", recognized: false };
}

/// Maiúsculas, sem acento e sem espaço sobrando — os rótulos chegam em
/// grafias inconsistentes ("Aprovado", "APROVADO POR NOTA", "aprovado ").
function normalizeLabel(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/// Período letivo no formato do CEA ("2025/2"). A UTFPR costuma escrever
/// "2025/2", "20252" ou "2025.2" dependendo do sistema.
export function normalizeTerm(raw: string | number | null | undefined): string {
  const text = String(raw ?? "").trim();
  const match = /^(\d{4})\s*[./-]?\s*([12])$/.exec(text);
  if (!match) {
    throw new AcademicSourceError(`Período letivo não reconhecido: "${text}".`);
  }
  return `${match[1]}/${match[2]}`;
}

/// Números chegam como string, com vírgula decimal ou vazios.
export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value =
    typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/// Uma linha da view de situação, como o driver a devolve.
export type UtfprStudentRow = {
  ra?: string | null;
  situacao?: string | null;
  periodo_atual?: string | number | null;
  /// CR na escala da UTFPR (0–1). Se a view devolver 0–10, divida aqui.
  coeficiente?: string | number | null;
  periodo_conclusao?: string | number | null;
};

/// Uma linha da view de matrículas.
export type UtfprEnrollmentRow = {
  codigo_disciplina?: string | null;
  periodo_letivo?: string | number | null;
  situacao?: string | null;
  nota?: string | number | null;
  frequencia?: string | number | null;
};

export type UtfprMapping = {
  record: SourceAcademicRecord;
  /// Rótulos que o mapa acima não conhecia. Não impedem a sincronização (o
  /// default conservador entra), mas vão para o log da execução: é assim que
  /// se descobre um código novo antes de ele virar dado errado na tela.
  unrecognizedLabels: string[];
};

/// Converte as linhas cruas das duas views no contrato do CEA.
export function mapUtfprRows(
  ra: string,
  studentRow: UtfprStudentRow,
  enrollmentRows: UtfprEnrollmentRow[],
): UtfprMapping {
  const unrecognizedLabels: string[] = [];
  const note = (label: string | null | undefined) => {
    const text = (label ?? "").trim();
    if (text && !unrecognizedLabels.includes(text))
      unrecognizedLabels.push(text);
  };

  const mappedStanding = mapStandingStatus(studentRow.situacao);
  if (!mappedStanding.recognized) note(studentRow.situacao);

  const enrollments: SourceEnrollment[] = [];
  for (const row of enrollmentRows) {
    const code = row.codigo_disciplina?.trim();
    if (!code) continue;
    const mapped = mapEnrollmentStatus(row.situacao);
    if (!mapped.recognized) note(row.situacao);
    const inProgress = mapped.status === "IN_PROGRESS";
    enrollments.push({
      subjectCode: code,
      term: normalizeTerm(row.periodo_letivo),
      status: mapped.status,
      // Nota/frequência de disciplina em curso não existem ainda; a view às
      // vezes devolve 0 no lugar de nulo, o que viraria "tirou zero".
      grade: inProgress ? null : parseNumber(row.nota),
      attendance: inProgress ? null : parseNumber(row.frequencia),
    });
  }

  const sourceGpa = parseNumber(studentRow.coeficiente);
  const standing: SourceStanding = {
    status: mappedStanding.status,
    currentPeriod: parseNumber(studentRow.periodo_atual),
    // Preferimos o CR oficial; sem ele, derivamos das notas (mesma regra do
    // provider sintético) para não deixar o fact ausente sem necessidade.
    gpa: sourceGpa ?? deriveGpa(enrollments),
    graduatedTerm:
      mappedStanding.status === "GRADUATED" && studentRow.periodo_conclusao
        ? normalizeTerm(studentRow.periodo_conclusao)
        : null,
  };

  return { record: { ra, standing, enrollments }, unrecognizedLabels };
}

// ── Provider ───────────────────────────────────────────────────────────────

/// SQL que a UTFPR precisa expor. Está aqui, e não só no documento, porque é
/// o texto que vai ser colado no pedido formal — e porque o dia da conexão
/// começa conferindo se a view devolve exatamente estas colunas.
export const REQUIRED_VIEWS_SQL = `
-- View 1 — situação do aluno (uma linha por RA)
CREATE VIEW cea_aluno AS
SELECT ra                AS ra,
       situacao          AS situacao,           -- ATIVO | TRANCADO | FORMADO | ...
       periodo_atual     AS periodo_atual,      -- inteiro, 1..N
       coeficiente       AS coeficiente,        -- CR 0..1
       periodo_conclusao AS periodo_conclusao   -- "2025/2", nulo se não formado
  FROM <tabela_de_alunos>;

-- View 2 — matrículas do aluno (uma linha por disciplina/período)
CREATE VIEW cea_matricula AS
SELECT ra                AS ra,
       codigo_disciplina AS codigo_disciplina,  -- ex.: CC1AED1
       periodo_letivo    AS periodo_letivo,     -- "2025/2"
       situacao          AS situacao,           -- APROVADO | REPROVADO | ...
       nota              AS nota,               -- 0..10
       frequencia        AS frequencia          -- 0..100
  FROM <tabela_de_matriculas>;
`.trim();

export function createUtfprProvider(): AcademicDataProvider {
  return {
    name: "utfpr",

    isConfigured: () => readUtfprConfig() !== null,

    async fetchStudent(ra: string): Promise<SourceAcademicRecord | null> {
      const config = readUtfprConfig();
      if (!config) {
        throw new AcademicSourceError(
          "Integração UTFPR não configurada: defina UTFPR_DATABASE_URL (e, se os nomes diferirem, UTFPR_STUDENT_VIEW / UTFPR_ENROLLMENT_VIEW).",
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // TODO(Fase 8 — dia da conexão): este é o ÚNICO ponto que falta.
      //
      // 1. `npm i pg` e `npm i -D @types/pg` (o CEA já usa @prisma/adapter-pg,
      //    então o driver não traz stack nova).
      // 2. Abrir o cliente com `config.databaseUrl` (pool de 1 conexão basta:
      //    a rotina é sequencial e roda fora do request).
      // 3. Rodar as duas consultas abaixo, SEMPRE parametrizadas ($1 = ra) —
      //    o RA vem do cadastro do aluno, não confie nele como texto:
      //
      //      SELECT * FROM ${config.studentView}     WHERE ra = $1
      //      SELECT * FROM ${config.enrollmentView}  WHERE ra = $1
      //
      // 4. `if (studentRows.length === 0) return null;`  → RA desconhecido.
      // 5. `return mapUtfprRows(ra, studentRows[0], enrollmentRows).record;`
      //    (o `unrecognizedLabels` do retorno merece ir para o log da execução
      //    — ver runAcademicSync.)
      // 6. Envolver tudo em try/catch e relançar como AcademicSourceError,
      //    para a rotina distinguir "fonte fora do ar" de "aluno inexistente".
      //
      // Conferir antes: as views devolvem as colunas de REQUIRED_VIEWS_SQL, e
      // o usuário tem SELECT só nelas.
      // ─────────────────────────────────────────────────────────────────────
      throw new AcademicSourceError(
        `Provider UTFPR ainda não implementado (Fase 8 entregou o contrato e o mapeamento). Falta ligar o driver em src/server/academic/utfpr-provider.ts — RA solicitado: ${ra}.`,
      );
    },
  };
}
