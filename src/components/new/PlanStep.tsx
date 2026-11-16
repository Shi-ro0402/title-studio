"use client";

// 新規② 記事企画

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import {
  PlanFieldsEditor,
  ToneSelector,
  adoptPending,
  discardPending,
  editedOrigin,
  mergeSuggestion,
  type FieldDef,
} from "@/components/shared/PlanFieldsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { newRecheck } from "@/lib/staleness";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { isBlank } from "@/lib/text";
import { hasErrors, validatePlanStep } from "@/lib/validation";
import { TONE_LABEL, type PlanField } from "@/state/newDraft";
import { useNewDraft } from "./useNewDraft";

const FIELD_DEFS: FieldDef<PlanField>[] = [
  { field: "theme", label: "テーマ", required: true, max: LIMITS.theme, multiline: false },
  { field: "persona", label: "ペルソナ（想定読者）", required: true, max: LIMITS.persona, multiline: true, hint: "誰が、何に困っていて、何を知りたいのか" },
  { field: "question", label: "読者の疑問・検索目的", required: true, max: LIMITS.question, multiline: true },
  { field: "summary", label: "構成・内容要約", required: false, max: LIMITS.summary, multiline: true, hint: "未入力の場合は「企画段階のタイトル候補」として生成します" },
  { field: "strength", label: "記事の強み", required: false, max: LIMITS.strength, multiline: true, hint: "経験・事例など、この記事ならではの点" },
];

export function PlanStep() {
  const { draft, keywords, locked, update, goToStep } = useNewDraft();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const errors = validatePlanStep(draft);

  const suggest = async () => {
    const result = await ai.run("企画を提案中", () => api.suggestPlan({ keywords }));
    if (result) update((d) => ({ ...d, ...mergeSuggestion(d, result), basis: { ...d.basis, plan: keywords.main ?? "" } }));
  };

  // 今の主キーワードで企画を確認した、と記録する
  const confirmPlan = () => update((d) => ({ ...d, basis: { ...d.basis, plan: keywords.main ?? "" } }));
  const recheck = newRecheck(draft, keywords);

  const hasAiValue = Object.values(draft.planOrigin).some((o) => o !== "none");

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        {recheck.plan && (
          <StaleNotice
            title="キーワード変更後、未確認"
            message={`企画を確認したときの主キーワードは「${draft.basis.plan || "未設定"}」です。今の主キーワードに合っているか確認し、必要なら修正または再提案してください。`}
            actions={[{ label: "今の内容で確認済みにする", onClick: confirmPlan }]}
          />
        )}

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">AIに企画を提案してもらう</h2>
              <p className="text-xs text-slate-500">
                選択したキーワードから、テーマ・ペルソナ・検索目的の案を作ります。手で入力した項目は、採用するか選べます。
              </p>
            </div>
            <AiButton label="企画を提案する" busyLabel="提案中…" running={ai.running} disabled={!keywords.main} onClick={suggest} />
          </div>
          {!keywords.main && (
            <p className="text-sm text-slate-700">
              主キーワードが未設定です。
              <button type="button" className="ml-1 underline" onClick={() => goToStep(0)} disabled={locked}>
                ①キーワードへ移動
              </button>
            </p>
          )}
          <AiError message={ai.error} onRetry={suggest} />
          {hasAiValue && <SampleNotice />}
        </div>

        <div className="flex flex-col gap-5">
          <PlanFieldsEditor
            idPrefix="plan"
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
          <ToneSelector name="new-tone" value={draft.tone} locked={locked} onChange={(tone) => update((d) => ({ ...d, tone }))} />
        </div>

        {/* 記事の制作方針（一覧で確認） */}
        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">記事の制作方針</h2>
          <dl className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-[10rem_1fr]">
            <dt className="text-slate-500">主キーワード</dt>
            <dd className="text-slate-900">{keywords.main ?? "未設定"}</dd>
            <dt className="text-slate-500">補助キーワード</dt>
            <dd className="text-slate-900">{keywords.sub.length ? keywords.sub.join("、") : "なし"}</dd>
            {FIELD_DEFS.map((def) => (
              <div key={def.field} className="contents">
                <dt className="text-slate-500">{def.label}</dt>
                <dd className="whitespace-pre-wrap text-slate-900">
                  {isBlank(draft.plan[def.field]) ? "未入力" : draft.plan[def.field]}
                </dd>
              </div>
            ))}
            <dt className="text-slate-500">トーン</dt>
            <dd className="text-slate-900">{TONE_LABEL[draft.tone]}</dd>
          </dl>
          {isBlank(draft.plan.summary) && (
            <p className="text-xs text-slate-600">構成・内容要約が未入力のため、「企画段階のタイトル候補」として進みます。</p>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          const ok = !hasErrors(validatePlanStep(draft));
          if (ok) confirmPlan();
          return ok;
        }}
      />
    </>
  );
}
