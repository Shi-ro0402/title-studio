"use client";

// リライト⑤ 改善タイトル候補

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { IssueList, StepLinks, ViewTabs } from "@/components/shared/ResultParts";
import { ClarifyPanel, toSupplements } from "@/components/shared/ClarifyPanel";
import { RefList } from "@/components/shared/TopRefsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { copyText, useToast } from "@/components/ui/Toast";
import { USING_SAMPLE_API, api } from "@/lib/api";
import { rewriteFingerprint, rewriteRecheck } from "@/lib/staleness";
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
  const recheck = rewriteRecheck(draft, keywords);

  const missing: { label: string; step: number }[] = [];
  if (hasErrors(validateLoadStep(draft))) missing.push({ label: "①記事読込：現在のタイトル・本文（5,000文字以内）", step: 0 });
  if (hasErrors(validateRewriteKeywordStep(draft, keywords))) missing.push({ label: "②キーワード・順位：主キーワード、または入力内容", step: 1 });
  if (hasErrors(validateConditionStep(draft))) missing.push({ label: "③条件確認：テーマ・ペルソナ・読者の疑問・内容要約", step: 2 });
  if (hasErrors(validateCompareStep(draft))) missing.push({ label: "④上位比較：登録した上位タイトルの入力内容", step: 3 });

  const staleSteps: { label: string; step: number }[] = [];
  if (recheck.url || recheck.analysis) staleSteps.push({ label: "①記事読込（URLまたは本文の変更後、未確認）", step: 0 });
  if (recheck.rank) staleSteps.push({ label: "②キーワード・順位（順位が未更新）", step: 1 });
  if (recheck.condition) staleSteps.push({ label: "③条件確認（キーワードまたは本文の変更後、未確認）", step: 2 });
  if (recheck.refs || recheck.comparison) staleSteps.push({ label: "④上位比較（上位情報は変更前の条件）", step: 3 });

  const referenceTitles = draft.topRefs.map((r) => r.title);

  const generate = async (withSupplements: boolean) => {
    if (missing.length > 0) return;
    const supplements = withSupplements ? toSupplements(draft.clarify) : [];
    const outcome = await ai.run(withSupplements ? "補足を反映して再確認中" : "改善タイトルを生成中", () =>
      api.generateRewriteTitles({
        keywords,
        currentTitle: draft.currentTitle,
        body: draft.body,
        plan: draft.plan,
        tone: draft.tone,
        referenceTitles,
        supplements,
      }),
    );
    if (!outcome) return;
    if (outcome.kind === "clarify") {
      update((d) => ({ ...d, clarify: { issues: outcome.issues, answers: {} } }));
      return;
    }
    update((d) => ({
      ...d,
      titles: { items: outcome.items, generatedAt: new Date().toISOString(), isSample: USING_SAMPLE_API },
      basis: { ...d.basis, titles: rewriteFingerprint.titles(d, keywords) },
      clarify: null,
    }));
    setView("titles");
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
            <StepLinks title="生成の前に、次の項目を確認してください。" items={missing} locked={locked} onGo={goToStep} tone="error" />
          ) : (
            draft.topRefs.length === 0 && <p className="text-sm text-slate-700">上位タイトルが未登録のため、参考比較を省略して生成します。</p>
          )}
          {staleSteps.length > 0 && (
            <StepLinks title="再確認が必要な工程があります（生成はできます）。" items={staleSteps} locked={locked} onGo={goToStep} tone="warn" />
          )}
          <p className="text-xs text-slate-500">本文にない数字・効果・実績などは加えません。参考上位は模倣や単純な言い換えには使いません。</p>
          <div>
            <AiButton label={result ? "改善タイトルを10案生成し直す" : "改善タイトルを10案生成する"} busyLabel="生成中…"
              running={ai.running} disabled={missing.length > 0} onClick={() => generate(false)} />
          </div>
          <AiError message={ai.error} onRetry={() => generate(draft.clarify !== null)} />
        </div>

        {draft.clarify && (
          <ClarifyPanel
            clarify={draft.clarify}
            running={ai.running}
            onAnswer={(id, value) =>
              update((d) => (d.clarify ? { ...d, clarify: { ...d.clarify, answers: { ...d.clarify.answers, [id]: value } } } : d))
            }
            onSubmit={() => generate(true)}
          />
        )}

        {!result ? (
          !draft.clarify && (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              まだ生成していません。条件を確認して「改善タイトルを10案生成する」を押してください。
            </p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {recheck.titles && (
              <StaleNotice title="変更前の条件で生成" message="生成したあとに条件が変わりました。下の候補は閲覧・コピーできますが、今の条件に合わせるには生成し直してください。" />
            )}
            {result.isSample && <SampleNotice />}
            <ViewTabs view={view} setView={setView} titleLabel={`改善候補 ${result.items.length}案`} refCount={draft.topRefs.length} />

            {view === "titles" ? (
              <>
                <IssueList issues={issues} />
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
