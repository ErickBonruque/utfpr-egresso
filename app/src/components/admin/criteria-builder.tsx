"use client";

import { useMemo, useState } from "react";
import {
  SubjectMultiSelect,
  type SubjectOption,
} from "@/components/admin/subject-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  CRITERIA_TYPES,
  type Criteria,
  type CriteriaType,
  describeCriteria,
} from "@/lib/criteria";

/// Interactive builder for achievement unlock criteria (pedido do Erick,
/// 2026-07-08: UX rica para criar diversos tipos de conquista). Emits the
/// criteria JSON through a hidden input; "" means manual achievement.
/// New criteria types: add to CRITERIA_TYPES + validateCriteria (lib) and a
/// branch below — the engine consumes the same contract.
export function CriteriaBuilder({
  subjects,
  defaultCriteria = null,
}: {
  subjects: SubjectOption[];
  defaultCriteria?: Criteria | null;
}) {
  const [type, setType] = useState<CriteriaType | "">(
    defaultCriteria?.type ?? "",
  );
  const [codes, setCodes] = useState<string[]>(
    defaultCriteria?.type === "subjects_approved"
      ? defaultCriteria.subjectCodes
      : [],
  );
  const [min, setMin] = useState<number>(
    defaultCriteria?.type === "subjects_approved" ||
      defaultCriteria?.type === "subjects_approved_count"
      ? defaultCriteria.min
      : 1,
  );
  const [subjectCode, setSubjectCode] = useState<string>(
    defaultCriteria?.type === "min_grade_in_subject"
      ? defaultCriteria.subjectCode
      : "",
  );
  const [minGrade, setMinGrade] = useState<number>(
    defaultCriteria?.type === "min_grade_in_subject"
      ? defaultCriteria.minGrade
      : 7,
  );
  const [minGpa, setMinGpa] = useState<number>(
    defaultCriteria?.type === "min_gpa" ? defaultCriteria.minGpa : 7,
  );
  const [period, setPeriod] = useState<number>(
    defaultCriteria?.type === "approved_full_period"
      ? defaultCriteria.period
      : 1,
  );
  const [minPct, setMinPct] = useState<number>(
    defaultCriteria?.type === "workload_pct" ? defaultCriteria.minPct : 50,
  );

  const criteria: Criteria | null = useMemo(() => {
    switch (type) {
      case "subjects_approved":
        if (codes.length === 0) return null;
        return {
          type,
          subjectCodes: codes,
          min: Math.min(Math.max(min, 1), codes.length),
        };
      case "subjects_approved_count":
        return { type, min: Math.max(min, 1) };
      case "min_grade_in_subject":
        if (!subjectCode) return null;
        return {
          type,
          subjectCode,
          minGrade: clampDecimal(minGrade, 0, 10),
        };
      case "min_gpa":
        return { type, minGpa: clampDecimal(minGpa, 0, 10) };
      case "approved_full_period":
        return { type, period: Math.max(Math.round(period), 1) };
      case "workload_pct":
        return {
          type,
          minPct: Math.min(Math.max(Math.round(minPct), 1), 100),
        };
      default:
        return null;
    }
  }, [type, codes, min, subjectCode, minGrade, minGpa, period, minPct]);

  const help = CRITERIA_TYPES.find((c) => c.type === type)?.help;
  const needsSubjectPick = type === "subjects_approved";
  const needsMinLabel =
    type === "subjects_approved" || type === "subjects_approved_count";

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border p-3">
      <input
        type="hidden"
        name="criteria"
        value={criteria ? JSON.stringify(criteria) : ""}
      />
      <legend className="px-1 font-medium text-sm">
        Critério de desbloqueio
      </legend>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="criteria-type">Tipo</Label>
        <NativeSelect
          id="criteria-type"
          value={type}
          onChange={(e) => setType(e.target.value as CriteriaType | "")}
        >
          <option value="">Manual (sem critério automático)</option>
          {CRITERIA_TYPES.map((c) => (
            <option key={c.type} value={c.type}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
        <p className="text-muted-foreground text-xs">
          {help ??
            "A conquista não é desbloqueada pelo motor — concessão manual."}
        </p>
      </div>

      {/* Disciplinas específicas */}
      {needsSubjectPick ? (
        <div className="flex flex-col gap-1.5">
          <Label>Disciplinas consideradas</Label>
          <SubjectMultiSelect
            subjects={subjects}
            inputName="criteria-subjects-preview"
            defaultSelected={codes}
            onSelectionChange={setCodes}
            maxHeightClass="max-h-40"
          />
        </div>
      ) : null}

      {/* Disciplina única (nota mínima) */}
      {type === "min_grade_in_subject" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="criteria-subject">Disciplina</Label>
          <NativeSelect
            id="criteria-subject"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
          >
            <option value="">Selecione uma disciplina…</option>
            {subjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {/* Campo de mínimo (count / subjects_approved) */}
      {needsMinLabel ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="criteria-min">
            {type === "subjects_approved"
              ? "Mínimo de aprovações dentre as selecionadas"
              : "Mínimo de disciplinas aprovadas no curso"}
          </Label>
          <Input
            id="criteria-min"
            type="number"
            min={1}
            max={type === "subjects_approved" ? codes.length || 1 : undefined}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-32"
          />
        </div>
      ) : null}

      {/* Nota mínima */}
      {type === "min_grade_in_subject" ? (
        <NumberField
          id="criteria-grade"
          label="Nota mínima (0 a 10)"
          value={minGrade}
          onChange={setMinGrade}
          min={0}
          max={10}
          step={0.1}
          hint="Ex.: 7 (padrão), 9 (excelência)."
        />
      ) : null}

      {/* CR mínimo */}
      {type === "min_gpa" ? (
        <NumberField
          id="criteria-gpa"
          label="CR mínimo (0 a 10)"
          value={minGpa}
          onChange={setMinGpa}
          min={0}
          max={10}
          step={0.1}
          hint="Escala UTFPR. Ex.: 5 (mínimo), 7 (bom), 8 (ótimo)."
        />
      ) : null}

      {/* Período completo */}
      {type === "approved_full_period" ? (
        <NumberField
          id="criteria-period"
          label="Período (1º, 2º, 3º…)"
          value={period}
          onChange={setPeriod}
          min={1}
          max={20}
          step={1}
          hint="O aluno precisa aprovar todas as disciplinas obrigatórias desse período."
        />
      ) : null}

      {/* Carga horária */}
      {type === "workload_pct" ? (
        <NumberField
          id="criteria-pct"
          label="Carga horária obrigatória (%)"
          value={minPct}
          onChange={setMinPct}
          min={1}
          max={100}
          step={1}
          hint="Ex.: 25 (início), 50 (metade), 100 (formando)."
        />
      ) : null}

      {type !== "" ? (
        <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
          {isIncomplete(type, {
            codes,
            subjectCode,
          })
            ? incompleteHint(type)
            : describeCriteria(criteria)}
        </p>
      ) : null}
    </fieldset>
  );
}

/// Small labeled number input to keep each criteria branch tidy.
function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32"
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function clampDecimal(n: number, lo: number, hi: number): number {
  const clamped = Math.min(Math.max(n, lo), hi);
  return Math.round(clamped * 10) / 10;
}

/// Whether the builder has enough input to emit a valid criteria object.
function isIncomplete(
  type: CriteriaType,
  state: { codes: string[]; subjectCode: string },
): boolean {
  if (type === "subjects_approved") return state.codes.length === 0;
  if (type === "min_grade_in_subject") return state.subjectCode === "";
  return false;
}

function incompleteHint(type: CriteriaType): string {
  if (type === "subjects_approved")
    return "Selecione ao menos uma disciplina para ativar o critério.";
  if (type === "min_grade_in_subject")
    return "Selecione a disciplina para ativar o critério.";
  return "Preencha os campos para ativar o critério.";
}
