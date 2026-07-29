// Normalização do que a view da UTFPR devolve (Fase 8). O provider ainda não
// conecta em nada, mas o mapeamento — que é onde a integração costuma quebrar
// em silêncio — já está escrito e coberto: rótulo desconhecido, escala de
// nota, formato de período letivo, nota fantasma de disciplina em curso.
import { describe, expect, it } from "vitest";
import { AcademicSourceError } from "../src/server/academic/provider";
import {
  mapEnrollmentStatus,
  mapStandingStatus,
  mapUtfprRows,
  normalizeTerm,
  parseNumber,
  readUtfprConfig,
} from "../src/server/academic/utfpr-provider";

describe("situação do aluno", () => {
  it("reconhece as grafias comuns, com ou sem acento e caixa", () => {
    expect(mapStandingStatus("ATIVO").status).toBe("ACTIVE");
    expect(mapStandingStatus(" concluído ").status).toBe("GRADUATED");
    expect(mapStandingStatus("Trancado").status).toBe("LOCKED");
    expect(mapStandingStatus("EVADIDO").status).toBe("DROPPED_OUT");
  });

  it("cai em ACTIVE, nunca em GRADUATED, quando não reconhece", () => {
    const mapped = mapStandingStatus("SITUACAO NOVA DA UTFPR");
    expect(mapped.status).toBe("ACTIVE");
    expect(mapped.recognized).toBe(false);
  });
});

describe("situação da matrícula", () => {
  it("mapeia aprovação, reprovação, curso e cancelamento", () => {
    expect(mapEnrollmentStatus("Aprovado por nota").status).toBe("APPROVED");
    expect(mapEnrollmentStatus("DISPENSADO").status).toBe("APPROVED");
    expect(mapEnrollmentStatus("Reprovado por frequência").status).toBe(
      "FAILED",
    );
    expect(mapEnrollmentStatus("EM CURSO").status).toBe("IN_PROGRESS");
    expect(mapEnrollmentStatus("Trancado").status).toBe("WITHDRAWN");
  });

  it("cai em IN_PROGRESS quando não reconhece — nunca inventa aprovação", () => {
    const mapped = mapEnrollmentStatus("CODIGO NOVO");
    expect(mapped.status).toBe("IN_PROGRESS");
    expect(mapped.recognized).toBe(false);
  });
});

describe("período letivo", () => {
  it("aceita as grafias que os sistemas da UTFPR usam", () => {
    expect(normalizeTerm("2025/2")).toBe("2025/2");
    expect(normalizeTerm("2025.2")).toBe("2025/2");
    expect(normalizeTerm("20252")).toBe("2025/2");
    expect(normalizeTerm(20251)).toBe("2025/1");
  });

  it("falha alto em formato desconhecido em vez de gravar lixo", () => {
    expect(() => normalizeTerm("2025/3")).toThrow(AcademicSourceError);
    expect(() => normalizeTerm("")).toThrow(AcademicSourceError);
    expect(() => normalizeTerm(null)).toThrow(AcademicSourceError);
  });
});

describe("números", () => {
  it("aceita vírgula decimal e trata vazio como ausente", () => {
    expect(parseNumber("8,5")).toBe(8.5);
    expect(parseNumber("7.25")).toBe(7.25);
    expect(parseNumber(9)).toBe(9);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber("N/A")).toBeNull();
  });
});

describe("mapeamento das linhas da view", () => {
  it("monta o registro completo do aluno", () => {
    const { record } = mapUtfprRows(
      "a2587246",
      {
        ra: "a2587246",
        situacao: "ATIVO",
        periodo_atual: "5",
        coeficiente: "0,82",
      },
      [
        {
          codigo_disciplina: "CC1AED1",
          periodo_letivo: "2024/1",
          situacao: "APROVADO",
          nota: "8,5",
          frequencia: "92",
        },
        {
          codigo_disciplina: "CC1BD1",
          periodo_letivo: "20252",
          situacao: "MATRICULADO",
          nota: "0",
          frequencia: "0",
        },
      ],
    );

    expect(record.standing).toEqual({
      status: "ACTIVE",
      currentPeriod: 5,
      gpa: 0.82,
      graduatedTerm: null,
    });
    expect(record.enrollments[0]).toEqual({
      subjectCode: "CC1AED1",
      term: "2024/1",
      status: "APPROVED",
      grade: 8.5,
      attendance: 92,
    });
  });

  it("descarta nota e frequência de disciplina em curso (a view manda 0)", () => {
    const { record } = mapUtfprRows("a2587246", { situacao: "ATIVO" }, [
      {
        codigo_disciplina: "CC1BD1",
        periodo_letivo: "2025/2",
        situacao: "CURSANDO",
        nota: "0",
        frequencia: "0",
      },
    ]);
    expect(record.enrollments[0]).toMatchObject({
      status: "IN_PROGRESS",
      grade: null,
      attendance: null,
    });
  });

  it("deriva o CR quando a view não traz coeficiente", () => {
    const { record } = mapUtfprRows(
      "a2587246",
      { situacao: "ATIVO", coeficiente: null },
      [
        {
          codigo_disciplina: "CC1AED1",
          periodo_letivo: "2024/1",
          situacao: "APROVADO",
          nota: "8",
        },
        {
          codigo_disciplina: "CC1BD1",
          periodo_letivo: "2024/1",
          situacao: "APROVADO",
          nota: "6",
        },
      ],
    );
    expect(record.standing.gpa).toBeCloseTo(0.7, 5);
  });

  it("só preenche período de conclusão para quem a fonte diz estar formado", () => {
    const formado = mapUtfprRows(
      "a2190001",
      { situacao: "FORMADO", periodo_conclusao: "2025/2" },
      [],
    );
    expect(formado.record.standing.graduatedTerm).toBe("2025/2");

    const ativo = mapUtfprRows(
      "a2587246",
      { situacao: "ATIVO", periodo_conclusao: "2025/2" },
      [],
    );
    expect(ativo.record.standing.graduatedTerm).toBeNull();
  });

  it("acumula os rótulos que não reconheceu, para virarem aviso no log", () => {
    const { unrecognizedLabels } = mapUtfprRows(
      "a2587246",
      { situacao: "SITUACAO NOVA" },
      [
        {
          codigo_disciplina: "CC1AED1",
          periodo_letivo: "2024/1",
          situacao: "CONCEITO C",
        },
        {
          codigo_disciplina: "CC1BD1",
          periodo_letivo: "2024/1",
          situacao: "CONCEITO C",
        },
      ],
    );
    expect(unrecognizedLabels).toEqual(["SITUACAO NOVA", "CONCEITO C"]);
  });

  it("ignora linha sem código de disciplina", () => {
    const { record } = mapUtfprRows("a2587246", { situacao: "ATIVO" }, [
      {
        codigo_disciplina: "  ",
        periodo_letivo: "2024/1",
        situacao: "APROVADO",
      },
    ]);
    expect(record.enrollments).toHaveLength(0);
  });
});

describe("configuração", () => {
  it("é nula sem UTFPR_DATABASE_URL — o provider avisa em vez de tentar conectar", () => {
    const previous = process.env.UTFPR_DATABASE_URL;
    process.env.UTFPR_DATABASE_URL = "";
    expect(readUtfprConfig()).toBeNull();

    process.env.UTFPR_DATABASE_URL = "postgres://leitura@utfpr/academico";
    expect(readUtfprConfig()).toMatchObject({
      databaseUrl: "postgres://leitura@utfpr/academico",
      studentView: "cea_aluno",
      enrollmentView: "cea_matricula",
    });

    if (previous === undefined) delete process.env.UTFPR_DATABASE_URL;
    else process.env.UTFPR_DATABASE_URL = previous;
  });
});
