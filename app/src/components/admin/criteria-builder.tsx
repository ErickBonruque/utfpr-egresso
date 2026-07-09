"use client";

import { useMemo, useState } from "react";
import { NativeSelect } from "@/components/admin/native-select";
import {
  SubjectMultiSelect,
  type SubjectOption,
} from "@/components/admin/subject-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
/// branch below — the engine (Fase 6) consumes the same contract.
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
  const [min, setMin] = useState<number>(defaultCriteria?.min ?? 1);

  const criteria: Criteria | null = useMemo(() => {
    if (type === "") return null;
    if (type === "subjects_approved") {
      if (codes.length === 0) return null;
      return {
        type,
        subjectCodes: codes,
        min: Math.min(Math.max(min, 1), codes.length),
      };
    }
    return { type, min: Math.max(min, 1) };
  }, [type, codes, min]);

  const help = CRITERIA_TYPES.find((c) => c.type === type)?.help;

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

      {type === "subjects_approved" ? (
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

      {type !== "" ? (
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

      <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
        {type === "subjects_approved" && codes.length === 0
          ? "Selecione ao menos uma disciplina para ativar o critério."
          : describeCriteria(criteria)}
      </p>
    </fieldset>
  );
}
