"use client";

// リライト⑤ 改善タイトル候補

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { RefList } from "@/components/shared/TopRefsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { copyText, useToast } from "@/components/ui/Toast";
import { USING_SAMPLE_API, api } from "@/lib/api";
import { countChars, isBlank } from "@/lib/text";
import { checkTitles } from "@/lib/titleCheck";
import {
  hasErrors,
  validateCompareStep,
  validateConditionStep,
  validateLoadStep,
  validateRewriteKeywordStep,
} from "@/lib/validation";
import { useRewriteDraft } from "./useRewriteDraft";

export function ImproveStep() {
  const { draft, keywords, locked, update, goToStep } = useRewriteDraft();
  const ai = useAiRunner();
  const toast = useToast();
  const [view, setView] = useState<"titles" | "refs">("titles");

  const missing: { label: string; step: number }[] = [];
  if (hasErrors(validateLoadStep(draft))) missing.push({ label: "①記事読込：現在のタイトル・本文（5,000文字以内）", step: 0 });
  if (hasErrors(validateRewriteKeywordStep(draft, keywords))) missing.push({ label: "②キーワード・順位：主キーワード、または入力内容", step: 1 });
  if (hasErrors(validateConditionStep(draft))) missing.push({ label: "③条件確認：テーマ・ペルソナ・読者の疑問・内容要約", step: 2 });
  if (hasErrors(validateCompareStep(draft))) missing.push({ label: "④上位比較：登録した上位タイトルの入力内容", step: 3 });

  const referenceTitles = draft.topRefs.map((r) => r.title);

  const generate = async () => {
    if (missing.length > 0) return;
    const result = await ai.run("改善タイトルを生成中", () =>
      api.generateRewriteTitles({
        keywords,
        currentTitle: draft.currentTitle,
        body: draft.body,
        plan: draft.plan,
        tone: draft.tone,
        referenceTitles,
      }),
    );
    if (result) {
      update((d) => ({
        ...d,
        titles: { items: result, generatedAt: new Date().toISOString(), isSample: USING_SAMPLE_API },
      }));
      setView("titles");
    }
  };

  const copy = async (text: string) => {
    const ok = await copyText(text);
    toast(ok ? "コピーしました" : "コピーできませんでした。タイトルを選択して手動でコピーしてください。", ok ? "success" : "error");
  };

  const result = draft.titles;
  const issues = result ? checkTitles(result.items.map((t) => t.text), referenceTitles) : [];

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        {/* 比較領域の上部に現在のタイトルを残す */}
        <div className="rounded-md border-2 border-teal-200 bg-teal-50 p-4 text-sm">
          <p className="text-xs text-slate-500">変更前のタイトル</p>
          <p className="font-bold text-slate-900">{isBlank(draft.currentTitle) ? "未入力" : draft.currentTitle}</p>
          {!isBlank(draft.currentTitle) && <p className="text-xs text-slate-500">{countChars(draft.currentTitle)}文字</p>}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          {missing.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-slate-800">生成の前に、次の項目を確認してください。</p>
              <ul className="flex flex-col gap-1 text-sm">
                {missing.map((m) => (
                  <li key={m.step} className="flex flex-wrap items-center gap-2">
                    <span className="text-red-700">・{m.label}</span>
                    <button type="button" className="underline" disabled={locked} onClick={() => goToStep(m.step)}>この工程へ移動</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            draft.topRefs.length === 0 && <p className="text-sm text-slate-700">上位タイトルが未登録のため、参考比較を省略して生成します。</p>
          )}
          <p className="text-xs text-slate-500">本文にない数字・効果・実績などは加えません。参考上位は模倣や単純な言い換えには使いません。</p>
          <div>
            <AiButton label="改善タイトルを10案生成する" busyLabel="生成中…" running={ai.running}
              disabled={missing.length > 0} onClick={generate} />
          </div>
          <AiError message={ai.error} onRetry={generate} />
        </div>

        {!result ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            まだ生成していません。条件を確認して「改善タイトルを10案生成する」を押してください。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {result.isSample && <SampleNotice />}
            <div role="tablist" aria-label="表示の切り替え" className="flex gap-2">
              <button type="button" role="tab" aria-selected={view === "titles"} onClick={() => setView("titles")}
                className={`rounded-md px-3 py-1.5 text-sm ${view === "titles" ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
                改善候補 {result.items.length}案
              </button>
              <button type="button" role="tab" aria-selected={view === "refs"} onClick={() => setView("refs")}
                className={`rounded-md px-3 py-1.5 text-sm ${view === "refs" ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
                参考上位 {draft.topRefs.length}件
              </button>
            </div>

            {view === "titles" ? (
              <>
                {issues.length > 0 && (
                  <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {issues.map((issue, i) => (
                      <li key={i}>{issue.index !== null ? `${issue.index + 1}番目：` : ""}{issue.message}</li>
                    ))}
                  </ul>
                )}
                <ol className="flex flex-col gap-2">
                  {result.items.map((t, i) => (
                    <li key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[2rem_1fr_auto] md:items-start">
                      <span className="text-sm font-bold text-slate-500">{i + 1}</span>
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-bold text-slate-900">{t.text}</p>
                        <p className="text-xs text-slate-500">{countChars(t.text)}文字　｜　狙い：{t.aim}</p>
                        <p className="text-xs text-slate-700"><span className="font-bold">改善ポイント：</span>{t.improvement}</p>
                        <p className="text-xs text-slate-700"><span className="font-bold">本文の根拠：</span>{t.evidence}</p>
                      </div>
                      <button type="button" onClick={() => copy(t.text)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50">
                        コピー
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <RefList refs={draft.topRefs} />
            )}

            <div>
              <button type="button" disabled
                className="cursor-not-allowed rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400">
                選んだタイトルで記事作成（準備中）
              </button>
            </div>
          </div>
        )}
      </section>

      <StepFooter />
    </>
  );
}
