// Bulk subject import parser (Fase 4).
import { describe, expect, it } from "vitest";
import { parseCurriculumImport } from "../src/lib/curriculum-import";

describe("parseCurriculumImport", () => {
  it("parses semicolon-separated lines", () => {
    const { rows, errors } = parseCurriculumImport(
      "CC1AED1; Algoritmos 1; 90; 2\ncc1md1; Matemática Discreta; 60; 1",
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        code: "CC1AED1",
        name: "Algoritmos 1",
        workloadHours: 90,
        period: 2,
        isElective: false,
        electiveGroup: null,
      },
      {
        code: "CC1MD1",
        name: "Matemática Discreta",
        workloadHours: 60,
        period: 1,
        isElective: false,
        electiveGroup: null,
      },
    ]);
  });

  it("parses tab-separated lines (spreadsheet paste)", () => {
    const { rows, errors } = parseCurriculumImport(
      "CC1A\tAlgoritmos; Avançados\t90\t2",
    );
    expect(errors).toEqual([]);
    // Tab wins as separator, so the ";" inside the name survives.
    expect(rows[0].name).toBe("Algoritmos; Avançados");
  });

  it("skips blank and header lines", () => {
    const { rows, errors } = parseCurriculumImport(
      "código; nome; carga; período\n\nCC1A; Algo; 60; 1\n",
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("marks electives by marker or period 0", () => {
    const { rows, errors } = parseCurriculumImport(
      "EL1; Eletiva Um; 60; 0\nEL2; Eletiva Dois; 60; 5; eletiva; 412",
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ isElective: true, electiveGroup: null });
    expect(rows[1]).toMatchObject({
      isElective: true,
      period: 5,
      electiveGroup: "412",
    });
  });

  it("reports line numbers for invalid rows and keeps valid ones", () => {
    const { rows, errors } = parseCurriculumImport(
      "CC1A; Algo; 60; 1\nCC1B; Faltando\nCC1C; Carga ruim; abc; 1\nCC1D; Período ruim; 60; x\nCC1A; Duplicada; 60; 2",
    );
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toContain("Linha 2");
    expect(errors[1]).toContain("Linha 3");
    expect(errors[2]).toContain("Linha 4");
    expect(errors[3]).toContain("repetido");
  });

  it("rejects unknown elective markers", () => {
    const { rows, errors } = parseCurriculumImport("CC1A; Algo; 60; 1; talvez");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain("eletiva");
  });
});
