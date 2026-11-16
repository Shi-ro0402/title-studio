"use client";

// 企画情報の入力欄（新規②・リライト③共通）
// AI推定の項目には出自を表示し、手で直したら「手動修正済み」に切り替える。
// 手で入力した項目へのAI提案は、差分を見て採用するか選べる。

import { Field, inputClass } from "@/components/ui/Field";
import type { Errors } from "@/lib/validation";
import { TONE_LABEL, type Origin, type Tone } from "@/state/newDraft";

export type FieldDef<F extends string> = {
  field: F;
  label: string;
  required: boolean;
  max: number;
  multiline: boolean;
  hint?: string;
};

export function OriginBadge({ origin }: { origin: Origin }) {
  if (origin === "ai")
    return <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-800">AI推定・編集できます</span>;
  if (origin === "edited")
    return <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-bold text-sky-800">手動修正済み</span>;
  return null;
}

type PlanFieldsEditorProps<F extends string> = {
  idPrefix: string;
  defs: FieldDef<F>[];
  values: Record<F, string>;
  origins: Record<F, Origin>;
  pending: Partial<Record<F, string>>;
  errors: Errors;
  showErrors: boolean;
  locked: boolean;
  onEdit: (field: F, value: string) => void;
  onAdopt: (field: F) => void;
  onDiscard: (field: F) => void;
};

export function PlanFieldsEditor<F extends string>({
  idPrefix, defs, values, origins, pending, errors, showErrors, locked, onEdit, onAdopt, onDiscard,
}: PlanFieldsEditorProps<F>) {
  return (
    <>
      {defs.map((def) => {
        const value = values[def.field];
        const suggestion = pending[def.field];
        const fieldError = errors[def.field];
        // 文字数超過はすぐ表示し、未入力は「次へ」を押してから表示する
        const error = showErrors ? fieldError : fieldError?.includes("超過") ? fieldError : undefined;
        const id = `${idPrefix}-${def.field}`;
        return (
          <div key={def.field} className="flex flex-col gap-2">
            <Field
              id={id}
              label={def.label}
              required={def.required}
              max={def.max}
              value={value}
              error={error}
              hint={def.hint}
              badge={<OriginBadge origin={origins[def.field]} />}
            >
              {def.multiline ? (
                <textarea id={id} rows={3} className={inputClass} value={value} disabled={locked}
                  aria-invalid={error ? true : undefined} onChange={(e) => onEdit(def.field, e.target.value)} />
              ) : (
                <input id={id} className={inputClass} value={value} disabled={locked}
                  aria-invalid={error ? true : undefined} onChange={(e) => onEdit(def.field, e.target.value)} />
              )}
            </Field>
            {suggestion !== undefined && (
              <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm">
                <p className="font-bold text-violet-900">AIの提案（未採用）</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{suggestion}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onAdopt(def.field)} disabled={locked}
                    className="rounded-md bg-violet-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
                    提案を採用する
                  </button>
                  <button type="button" onClick={() => onDiscard(def.field)} disabled={locked}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-50">
                    今の内容を残す
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function ToneSelector({ name, value, locked, onChange }: { name: string; value: Tone; locked: boolean; onChange: (tone: Tone) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">
        トーン
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">初期値あり</span>
      </legend>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(TONE_LABEL) as Tone[]).map((tone) => (
          <label key={tone} className="flex items-center gap-1.5 text-sm text-slate-800">
            <input type="radio" name={name} value={tone} checked={value === tone} disabled={locked} onChange={() => onChange(tone)} />
            {TONE_LABEL[tone]}
            {tone === "easy" && <span className="text-xs text-slate-500">（初期値）</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * AIの提案を企画情報に反映する。
 * 空欄・AI推定のままの項目は置き換え、手で入力・修正した項目は「未採用の提案」として残す。
 */
export function mergeSuggestion<F extends string>(
  current: { plan: Record<F, string>; planOrigin: Record<F, Origin>; planPending: Partial<Record<F, string>> },
  suggestion: Partial<Record<F, string>>,
) {
  const plan = { ...current.plan };
  const planOrigin = { ...current.planOrigin };
  const planPending = { ...current.planPending };
  for (const key of Object.keys(suggestion) as F[]) {
    const value = suggestion[key];
    if (!value) continue;
    if (plan[key].trim() === "" || planOrigin[key] === "ai") {
      plan[key] = value;
      planOrigin[key] = "ai";
      delete planPending[key];
    } else if (value !== plan[key]) {
      planPending[key] = value;
    }
  }
  return { plan, planOrigin, planPending };
}

/** 項目を編集したときの出自の更新（AI推定を直したら手動修正済み） */
export function editedOrigin(origin: Origin): Origin {
  return origin === "ai" ? "edited" : origin;
}

/** 未採用の提案を採用する */
export function adoptPending<F extends string>(
  current: { plan: Record<F, string>; planOrigin: Record<F, Origin>; planPending: Partial<Record<F, string>> },
  field: F,
) {
  const value = current.planPending[field];
  if (value === undefined) return current;
  const planPending = { ...current.planPending };
  delete planPending[field];
  return {
    plan: { ...current.plan, [field]: value },
    planOrigin: { ...current.planOrigin, [field]: "ai" as Origin },
    planPending,
  };
}

export function discardPending<F extends string>(pending: Partial<Record<F, string>>, field: F) {
  const next = { ...pending };
  delete next[field];
  return next;
}
