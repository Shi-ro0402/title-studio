"use client";

// リライト③ 記事条件を確認

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import {
  PlanFieldsEditor,
  ToneSelector,
  adoptPending,
  discardPending,
  editedOrigin,
  type FieldDef,
} from "@/components/shared/PlanFieldsEditor";
import { LIMITS } from "@/lib/limits";
import { isBlank } from "@/lib/text";
import { hasErrors, validateConditionStep } from "@/lib/validation";
import type { RewritePlanField } from "@/state/rewriteDraft";
import { useRewriteDraft } from "./useRewriteDraft";

const FIELD_DEFS: FieldDef<RewritePlanField>[] = [
  { field: "theme", label: "テーマ", required: true, max: LIMITS.theme, multiline: false },
  { field: "persona", label: "ペルソナ（想定読者）", required: true, max: LIMITS.persona, multiline: true },
  { field: "question", label: "読者の疑問・検索目的", required: true, max: LIMITS.question, multiline: true },
  { field: "summary", label: "内容要約", required: true, max: LIMITS.summary, multiline: true, hint: "現在の本文で答えている内容をまとめてください" },
  { field: "strength", label: "記事の強み", required: false, max: LIMITS.strength, multiline: true },
  { field: "improvement", label: "改善したい点", required: false, max: LIMITS.improvement, multiline: true, hint: "例：クリックされにくい、内容が伝わりにくい" },
];

export function ConditionStep() {
  const { draft, keywords, locked, update, goToStep } = useRewriteDraft();
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateConditionStep(draft);
  const analyzed = draft.keywordCandidates !== null;

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        <div className="flex flex-col gap-1 rounded-md bg-slate-50 p-4 text-sm">
          <p><span className="text-slate-500">現在のタイトル：</span>{isBlank(draft.currentTitle) ? "未入力" : draft.currentTitle}</p>
          <p><span className="text-slate-500">主キーワード：</span>{keywords.main ?? "未設定"}</p>
          {!analyzed && (
            <p className="mt-2 text-slate-700">
              「記事を分析する」を実行すると、AIが推定した内容がここに入ります。手で入力して進めることもできます。
              <button type="button" className="ml-1 underline" disabled={locked} onClick={() => goToStep(0)}>①記事読込へ移動</button>
            </p>
          )}
        </div>

        <p className="text-sm text-slate-700">
          AIの推定内容が本文と合っているかを確認してから、次へ進んでください。リライトでは、現在の記事の内容を保ち、タイトルの伝わり方を改善します。
        </p>

        <div className="flex flex-col gap-5">
          <PlanFieldsEditor
            idPrefix="condition"
            defs={FIELD_DEFS}
            values={draft.plan}
            origins={draft.planOrigin}
            pending={draft.planPending}
            errors={errors}
            showErrors={showErrors}
            locked={locked}
            onEdit={(field, value) =>
              update((d) => ({
                ...d,
                plan: { ...d.plan, [field]: value },
                planOrigin: { ...d.planOrigin, [field]: editedOrigin(d.planOrigin[field]) },
              }))
            }
            onAdopt={(field) => update((d) => ({ ...d, ...adoptPending(d, field) }))}
            onDiscard={(field) => update((d) => ({ ...d, planPending: discardPending(d.planPending, field) }))}
          />
          <ToneSelector name="rewrite-tone" value={draft.tone} locked={locked} onChange={(tone) => update((d) => ({ ...d, tone }))} />
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return !hasErrors(validateConditionStep(draft));
        }}
      />
    </>
  );
}
