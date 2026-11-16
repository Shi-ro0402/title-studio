"use client";

// 新規② 記事企画

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { Field, inputClass } from "@/components/ui/Field";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { isBlank } from "@/lib/text";
import { validatePlanStep } from "@/lib/validation";
import { TONE_LABEL, type Origin, type PlanField, type Tone } from "@/state/newDraft";
import { useNewDraft } from "./useNewDraft";

const FIELD_DEFS: {
  field: PlanField;
  label: string;
  required: boolean;
  max: number;
  multiline: boolean;
  hint?: string;
}[] = [
  { field: "theme", label: "テーマ", required: true, max: LIMITS.theme, multiline: false },
  { field: "persona", label: "ペルソナ（想定読者）", required: true, max: LIMITS.persona, multiline: true, hint: "誰が、何に困っていて、何を知りたいのか" },
  { field: "question", label: "読者の疑問・検索目的", required: true, max: LIMITS.question, multiline: true },
  { field: "summary", label: "構成・内容要約", required: false, max: LIMITS.summary, multiline: true, hint: "未入力の場合は「企画段階のタイトル候補」として生成します" },
  { field: "strength", label: "記事の強み", required: false, max: LIMITS.strength, multiline: true, hint: "経験・事例など、この記事ならではの点" },
];

export function OriginBadge({ origin }: { origin: Origin }) {
  if (origin === "ai")
    return <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-800">AI推定・編集できます</span>;
  if (origin === "edited")
    return <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-bold text-sky-800">手動修正済み</span>;
  return null;
}

export function PlanStep() {
  const { draft, keywords, locked, update, goToStep } = useNewDraft();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const errors = validatePlanStep(draft);

  const editField = (field: PlanField, value: string) =>
    update((d) => ({
      ...d,
      plan: { ...d.plan, [field]: value },
      // AI推定の項目を手で直したら「手動修正済み」にする
      planOrigin: { ...d.planOrigin, [field]: d.planOrigin[field] === "ai" ? "edited" : d.planOrigin[field] },
    }));

  const suggest = async () => {
    const result = await ai.run("企画を提案中", () => api.suggestPlan({ keywords }));
    if (!result) return;
    update((d) => {
      const plan = { ...d.plan };
      const planOrigin = { ...d.planOrigin };
      const planPending = { ...d.planPending };
      for (const [key, value] of Object.entries(result)) {
        const field = key as PlanField;
        if (!value) continue;
        // 空欄またはAI推定のままの項目は置き換える。手で入力・修正した項目は差分を確認してから採用する
        if (isBlank(plan[field]) || planOrigin[field] === "ai") {
          plan[field] = value;
          planOrigin[field] = "ai";
          delete planPending[field];
        } else if (value !== plan[field]) {
          planPending[field] = value;
        }
      }
      return { ...d, plan, planOrigin, planPending };
    });
  };

  const adoptPending = (field: PlanField) =>
    update((d) => {
      const value = d.planPending[field];
      if (value === undefined) return d;
      const planPending = { ...d.planPending };
      delete planPending[field];
      return {
        ...d,
        plan: { ...d.plan, [field]: value },
        planOrigin: { ...d.planOrigin, [field]: "ai" },
        planPending,
      };
    });

  const discardPending = (field: PlanField) =>
    update((d) => {
      const planPending = { ...d.planPending };
      delete planPending[field];
      return { ...d, planPending };
    });

  const hasAiValue = Object.values(draft.planOrigin).some((o) => o !== "none");

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">AIに企画を提案してもらう</h2>
              <p className="text-xs text-slate-500">
                選択したキーワードから、テーマ・ペルソナ・検索目的の案を作ります。手で入力した項目は、採用するか選べます。
              </p>
            </div>
            <AiButton
              label="企画を提案する"
              busyLabel="提案中…"
              running={ai.running}
              disabled={!keywords.main}
              onClick={suggest}
            />
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
          {FIELD_DEFS.map((def) => {
            const value = draft.plan[def.field];
            const pending = draft.planPending[def.field];
            const error = showErrors ? errors[def.field] : value && errors[def.field]?.includes("超過") ? errors[def.field] : undefined;
            const id = `plan-${def.field}`;
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
                  badge={<OriginBadge origin={draft.planOrigin[def.field]} />}
                >
                  {def.multiline ? (
                    <textarea
                      id={id}
                      rows={3}
                      className={inputClass}
                      value={value}
                      disabled={locked}
                      aria-invalid={error ? true : undefined}
                      onChange={(e) => editField(def.field, e.target.value)}
                    />
                  ) : (
                    <input
                      id={id}
                      className={inputClass}
                      value={value}
                      disabled={locked}
                      aria-invalid={error ? true : undefined}
                      onChange={(e) => editField(def.field, e.target.value)}
                    />
                  )}
                </Field>
                {pending !== undefined && (
                  <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm">
                    <p className="font-bold text-violet-900">AIの提案（未採用）</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{pending}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => adoptPending(def.field)}
                        disabled={locked}
                        className="rounded-md bg-violet-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        提案を採用する
                      </button>
                      <button
                        type="button"
                        onClick={() => discardPending(def.field)}
                        disabled={locked}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-50"
                      >
                        今の内容を残す
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">
              トーン
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">初期値あり</span>
            </legend>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(TONE_LABEL) as Tone[]).map((tone) => (
                <label key={tone} className="flex items-center gap-1.5 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="tone"
                    value={tone}
                    checked={draft.tone === tone}
                    disabled={locked}
                    onChange={() => update((d) => ({ ...d, tone }))}
                  />
                  {TONE_LABEL[tone]}
                  {tone === "easy" && <span className="text-xs text-slate-500">（初期値）</span>}
                </label>
              ))}
            </div>
          </fieldset>
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
            <p className="text-xs text-slate-600">
              構成・内容要約が未入力のため、「企画段階のタイトル候補」として進みます。
            </p>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return Object.keys(validatePlanStep(draft)).length === 0;
        }}
      />
    </>
  );
}
