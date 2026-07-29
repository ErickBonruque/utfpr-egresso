// Política de escrita da sincronização acadêmica (Fase 8): "a UTFPR
// sobrescreve, sem apagar" (decisão do Erick, 2026-07-29). É a regra que
// decide o que uma resposta da fonte faz com o histórico já espelhado —
// errar aqui apaga o histórico de um aluno, então ela é pura e testada
// antes de qualquer conexão real existir.
import { describe, expect, it } from "vitest";
import {
  deriveGpa,
  type MirrorEnrollment,
  planEnrollmentWrites,
  type SourceEnrollment,
} from "../src/lib/academic-sync";

const SUBJECTS = new Map([
  ["CC1AED1", "subject-aed"],
  ["CC1BD1", "subject-bd"],
  ["CC1SO1", "subject-so"],
]);

function source(over: Partial<SourceEnrollment> = {}): SourceEnrollment {
  return {
    subjectCode: "CC1AED1",
    term: "2025/1",
    status: "APPROVED",
    grade: 8.5,
    attendance: 90,
    ...over,
  };
}

function mirror(over: Partial<MirrorEnrollment> = {}): MirrorEnrollment {
  return {
    id: "enr-1",
    subjectCode: "CC1AED1",
    term: "2025/1",
    status: "APPROVED",
    grade: 8.5,
    attendance: 90,
    ...over,
  };
}

describe("linhas novas", () => {
  it("cria o que a fonte tem e o espelho não", () => {
    const plan = planEnrollmentWrites([source()], [], SUBJECTS);
    expect(plan.toCreate).toEqual([
      {
        subjectId: "subject-aed",
        subjectCode: "CC1AED1",
        term: "2025/1",
        status: "APPROVED",
        grade: 8.5,
        attendance: 90,
      },
    ]);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("trata (disciplina, período) como chave: retomada vira linha nova", () => {
    const plan = planEnrollmentWrites(
      [
        source({ term: "2025/1", status: "FAILED", grade: 3 }),
        source({ term: "2025/2", status: "APPROVED", grade: 7 }),
      ],
      [mirror({ term: "2025/1", status: "FAILED", grade: 3 })],
      SUBJECTS,
    );
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].term).toBe("2025/2");
    expect(plan.unchanged).toBe(1);
  });

  it("não escreve disciplina fora da matriz cadastrada — reporta", () => {
    const plan = planEnrollmentWrites(
      [
        source({ subjectCode: "XX9NOVA1" }),
        source({ subjectCode: "XX9NOVA1", term: "2025/2" }),
      ],
      [],
      SUBJECTS,
    );
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.unknownSubjectCodes).toEqual(["XX9NOVA1"]);
  });
});

describe("a fonte sobrescreve o espelho", () => {
  it("atualiza quando a nota é lançada no fechamento do semestre", () => {
    const plan = planEnrollmentWrites(
      [source({ status: "APPROVED", grade: 9.1, attendance: 95 })],
      [mirror({ status: "IN_PROGRESS", grade: null, attendance: null })],
      SUBJECTS,
    );
    expect(plan.toUpdate).toEqual([
      {
        id: "enr-1",
        subjectCode: "CC1AED1",
        term: "2025/1",
        status: "APPROVED",
        grade: 9.1,
        attendance: 95,
      },
    ]);
    expect(plan.toCreate).toHaveLength(0);
  });

  it("corrige uma nota revisada para menos (não é só 'preencher vazio')", () => {
    const plan = planEnrollmentWrites(
      [source({ grade: 6 })],
      [mirror({ grade: 9 })],
      SUBJECTS,
    );
    expect(plan.toUpdate[0].grade).toBe(6);
  });

  it("não escreve quando nada mudou", () => {
    const plan = planEnrollmentWrites([source()], [mirror()], SUBJECTS);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });
});

describe("sem apagar", () => {
  it("preserva o histórico que a fonte não devolveu (resposta parcial)", () => {
    const plan = planEnrollmentWrites(
      [source({ subjectCode: "CC1AED1" })],
      [
        mirror({ id: "enr-1", subjectCode: "CC1AED1" }),
        mirror({ id: "enr-2", subjectCode: "CC1BD1", term: "2024/2" }),
        mirror({ id: "enr-3", subjectCode: "CC1SO1", term: "2024/1" }),
      ],
      SUBJECTS,
    );
    expect(plan.missingFromSource).toBe(2);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("fonte vazia não produz escrita nenhuma", () => {
    const plan = planEnrollmentWrites([], [mirror()], SUBJECTS);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.missingFromSource).toBe(1);
  });
});

describe("CR derivado", () => {
  it("é a média das notas lançadas, na escala 0–1 do espelho", () => {
    expect(deriveGpa([{ grade: 8 }, { grade: 6 }])).toBeCloseTo(0.7, 5);
  });

  it("ignora quem está em curso (nota nula)", () => {
    expect(deriveGpa([{ grade: 10 }, { grade: null }])).toBeCloseTo(1, 5);
  });

  it("é null para calouro sem nota — o engine trata como fact ausente, não zero", () => {
    expect(deriveGpa([])).toBeNull();
    expect(deriveGpa([{ grade: null }])).toBeNull();
  });
});
