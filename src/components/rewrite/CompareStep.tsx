"use client";

// リライト④ 上位タイトルと比較

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { StaleRefsNotice, TopRefsEditor, TrendTags, changeRefs, confirmRefs } from "@/components/shared/TopRefsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { rewriteFingerprint, rewriteRecheck } from "@/lib/staleness";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { isBlank } from "@/lib/text";
import { hasErrors, validateCompareStep } from "@/lib/validation";
import { useRewriteDraft } from "./useRewriteDraft";

export function CompareStep() {
  const { draft, keywords, locked, update } = useRewriteDraft();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateCompareStep(draft);

  const compare = async () => {
    setShowErrors(true);
    if (hasErrors(errors) || draft.topRefs.length === 0) return;
    const result = await ai.run("上位タイトルと比較中", () =>
      api.compareTop({
        currentTitle: draft.currentTitle,
        mainKeyword: keywords.main ?? "",
        body: draft.body,
        refs: draft.topRefs.map((r) => ({ id: r.id, title: r.title.trim() })),
      }),
    );
    if (result) update((d) => ({ ...d, comparison: result, basis: { ...d.basis, comparison: rewriteFingerprint.comparison(d, keywords) } }));
  };

  const recheck = rewriteRecheck(draft, keywords);
  const resetRefs = () => {
    if (!window.confirm("登録した上位タイトルと比較結果をすべて削除します。よろしいですか？")) return;
    update((d) => ({ ...d, topRefs: [], comparison: null, basis: { ...d.basis, refsKeyword: undefined, comparison: undefined } }));
  };

  const c = draft.comparison;

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        <div className="flex flex-col gap-1 rounded-md border-2 border-teal-200 bg-teal-50 p-4 text-sm">
          <p><span className="text-slate-500">現在のタイトル：</span><span className="font-bold">{isBlank(draft.currentTitle) ? "未入力" : draft.currentTitle}</span></p>
          <p><span className="text-slate-500">対象キーワード：</span>{keywords.main ?? "未設定"}</p>
        </div>

        {recheck.refs && (
          <StaleRefsNotice
            registeredKeyword={draft.basis.refsKeyword ?? ""}
            onConfirm={() => update((d) => confirmRefs(d, keywords.main))}
            onReset={resetRefs}
          />
        )}

        <TopRefsEditor
          refs={draft.topRefs}
          onChange={(fn) => update((d) => changeRefs(d, fn, keywords.main))}
          mainKeyword={keywords.main}
          errors={errors}
          showErrors={showErrors}
          locked={locked}
          emptyMessage="登録がない場合は、上位タイトルとの比較を省略して進みます。現在順位が未入力でも進めます。"
        />

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">現在のタイトルと比較</h2>
              <p className="text-xs text-slate-500">
                状態：{ai.running ? "比較中" : !c ? "比較前" : recheck.comparison ? "条件変更後（再比較が必要）" : "比較済み"}
              </p>
            </div>
            <AiButton label="上位タイトルと比較する" busyLabel="比較中…" running={ai.running}
              disabled={draft.topRefs.length === 0} onClick={compare} />
          </div>
          {draft.topRefs.length > 0 && draft.topRefs.length < LIMITS.topRefs && (
            <p className="text-xs text-slate-500">登録された{draft.topRefs.length}件で比較します。</p>
          )}
          <AiError message={ai.error} onRetry={compare} />
          {recheck.comparison && (
            <StaleNotice title="上位情報は変更前の条件です" message="比較したあとに、上位タイトル・主キーワード・現在のタイトル・本文のいずれかが変わりました。下の比較は変更前の条件の結果です。再比較してください。" />
          )}
          {c && (
            <div className="flex flex-col gap-4">
              <SampleNotice />
              <TrendTags trend={c.trend} refs={draft.topRefs} />
              <div className="grid gap-3 md:grid-cols-3">
                <PointList title="共通点" items={c.common} />
                <PointList title="相違点" items={c.differences} />
                <PointList title="本文で回答できる範囲" items={c.answerable} />
              </div>
              <p className="text-xs text-slate-500">
                上位タイトルは参考情報です。本文にない論点を、記事にあるものとして扱わないでください。
              </p>
            </div>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return !hasErrors(validateCompareStep(draft));
        }}
      />
    </>
  );
}

function PointList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
