// Parser for the bulk subject import (Fase 4): admins paste rows copied from
// a spreadsheet/CSV, one subject per line. Pure — used by the client preview
// and re-validated by the server action.
//
// Accepted line format (separator: tab or ";"):
//   CÓDIGO; NOME; CARGA HORÁRIA; PERÍODO[; ELETIVA[; GRUPO]]
// - PERÍODO 0 (ou "eletiva" na 5ª coluna) marca disciplina eletiva.
// - Header lines (starting with "código"/"codigo") are skipped.

export type ImportedSubject = {
  code: string;
  name: string;
  workloadHours: number;
  period: number;
  isElective: boolean;
  electiveGroup: string | null;
};

export type ImportResult = {
  rows: ImportedSubject[];
  /// pt-BR messages, one per rejected line, prefixed with the line number.
  errors: string[];
};

const ELECTIVE_MARKERS = new Set(["eletiva", "sim", "x", "true", "1"]);
const NON_ELECTIVE_MARKERS = new Set(["", "não", "nao", "false", "0"]);

function splitLine(line: string): string[] {
  const separator = line.includes("\t") ? "\t" : ";";
  return line.split(separator).map((part) => part.trim());
}

export function parseCurriculumImport(text: string): ImportResult {
  const rows: ImportedSubject[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const lineNo = i + 1;
    const parts = splitLine(line);
    if (/^c[oó]digo$/i.test(parts[0] ?? "")) continue; // header

    if (parts.length < 4) {
      errors.push(
        `Linha ${lineNo}: esperado CÓDIGO; NOME; CARGA HORÁRIA; PERÍODO (recebido ${parts.length} coluna(s)).`,
      );
      continue;
    }

    const [code, name, hoursRaw, periodRaw, electiveRaw, groupRaw] = parts;
    if (code === "" || name === "") {
      errors.push(`Linha ${lineNo}: código e nome são obrigatórios.`);
      continue;
    }
    if (seenCodes.has(code.toUpperCase())) {
      errors.push(`Linha ${lineNo}: código ${code} repetido na colagem.`);
      continue;
    }

    const workloadHours = Number(hoursRaw);
    if (!Number.isInteger(workloadHours) || workloadHours <= 0) {
      errors.push(
        `Linha ${lineNo}: carga horária inválida ("${hoursRaw}") — use um inteiro positivo.`,
      );
      continue;
    }

    const period = Number(periodRaw);
    if (!Number.isInteger(period) || period < 0) {
      errors.push(
        `Linha ${lineNo}: período inválido ("${periodRaw}") — use um inteiro (0 para eletivas).`,
      );
      continue;
    }

    const electiveMarker = (electiveRaw ?? "").toLowerCase();
    let isElective: boolean;
    if (ELECTIVE_MARKERS.has(electiveMarker)) {
      isElective = true;
    } else if (NON_ELECTIVE_MARKERS.has(electiveMarker)) {
      isElective = period === 0;
    } else {
      errors.push(
        `Linha ${lineNo}: marcador de eletiva inválido ("${electiveRaw}") — use "eletiva"/"sim" ou deixe vazio.`,
      );
      continue;
    }

    seenCodes.add(code.toUpperCase());
    rows.push({
      code: code.toUpperCase(),
      name,
      workloadHours,
      period,
      isElective,
      electiveGroup: isElective && groupRaw ? groupRaw : null,
    });
  }

  return { rows, errors };
}
