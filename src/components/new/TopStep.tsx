"use client";

// 新規③ 上位分析

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { TopRefsEditor, TrendTags } from "@/components/shared/TopRefsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { hasErrors, validateTopStep } from "@/lib/validation";
import { useNewDraft } from "./useNewDraft";

export function TopStep() {
  const { draft, keywords, locked, update } = useNewDraft();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateTopStep(draft);

  const analyze = async () => {
    setShowErrors(true);
    if (hasErrors(errors) || draft.topRefs.length === 0) return;
    const result = await ai.run("上位タイトルを分析中", () =>
      api.analyzeTop({
        mainKeyword: keywords.main ?? "",
        refs: draft.topRefs.map((r) => ({ id: r.id, title: r.title.trim() })),
      }),
    );
    if (result) update((d) => ({ ...d, trend: result }));
  };

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        <TopRefsEditor
          refs={draft.topRefs}
          onChange={(fn) => update((d) => ({ ...d, topRefs: fn(d.topRefs) }))}
          mainKeyword={keywords.main}
          errors={errors}
          showErrors={showErrors}
          locked={locked}
          emptyMessage="登録がない場合は、上位タイトルの参考分析を省略して進みます。"
        />

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">傾向の分析</h2>
              <p className="text-xs text-slate-500">
                状態：{ai.running ? "分析中" : draft.trend ? "分析済み" : "分析前"}
              </p>
            </div>
            <AiButton label="上位タイトルを分析する" busyLabel="分析中…" running={ai.running}
              disabled={draft.topRefs.length === 0} onClick={analyze} />
          </div>
          {draft.topRefs.length > 0 && draft.topRefs.length < LIMITS.topRefs && (
            <p className="text-xs text-slate-500">登録された{draft.topRefs.length}件で分析します。</p>
          )}
          <AiError message={ai.error} onRetry={analyze} />
          {draft.trend && (
            <div className="flex flex-col gap-3">
              <SampleNotice />
              <TrendTags trend={draft.trend} refs={draft.topRefs} />
            </div>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return !hasErrors(validateTopStep(draft));
        }}
      />
    </>
  );
}
