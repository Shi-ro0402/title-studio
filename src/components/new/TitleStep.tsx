"use client";

// 新規④ タイトル候補

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { ClarifyPanel, toSupplements } from "@/components/shared/ClarifyPanel";
import { IssueList, StepLinks, ViewTabs } from "@/components/shared/ResultParts";
import { RefList } from "@/components/shared/TopRefsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { copyText, useToast } from "@/components/ui/Toast";
import { USING_SAMPLE_API, api } from "@/lib/api";
import { newFingerprint, newRecheck } from "@/lib/staleness";
import { countChars, isBlank } from "@/lib/text";
import { checkTitles } from "@/lib/titleCheck";
import { hasErrors, validateKeywordStep, validatePlanStep, validateTopStep } from "@/lib/validation";
import { useNewDraft } from "./useNewDraft";

export function TitleStep() {
  const { draft, keywords, locked, update, goToStep } = useNewDraft();
  const ai = useAiRunner();
  const toast = useToast();
  const [view, setView] = useState<"titles" | "refs">("titles");
  const recheck = newRecheck(draft, keywords);

  // 生成前に、必須情報がそろっているかを工程ごとに確認する
  const missing: { label: string; step: number }[] = [];
  if (hasErrors(validateKeywordStep(draft, keywords)))
    missing.push({ label: "①キーワード：主キーワードの設定、または候補の入力内容", step: 0 });
  if (hasErrors(validatePlanStep(draft)))
    missing.push({ label: "②記事企画：テーマ・ペルソナ・読者の疑問の入力、または文字数", step: 1 });
  if (hasErrors(validateTopStep(draft)))
    missing.push({ label: "③上位分析：登録した上位タイトルの入力内容", step: 2 });

  // 再確認が必要な前の工程（生成は止めないが、案内する）
  const staleSteps: { label: string; step: number }[] = [];
  if (recheck.plan) staleSteps.push({ label: "②記事企画（キーワード変更後、未確認）", step: 1 });
  if (recheck.refs || recheck.trend) staleSteps.push({ label: "③上位分析（上位情報は変更前の条件）", step: 2 });

  const referenceTitles = draft.topRefs.map((r) => r.title);

  /** withSupplements：補足質問への回答を付けて再実行するか */
  const generate = async (withSupplements: boolean) => {
    if (missing.length > 0) return;
    const supplements = withSupplements ? toSupplements(draft.clarify) : [];
    const outcome = await ai.run(withSupplements ? "補足を反映して再確認中" : "タイトルを生成中", () =>
      api.generateTitles({ keywords, plan: draft.plan, tone: draft.tone, referenceTitles, supplements }),
    );
    if (!outcome) return;
    if (outcome.kind === "clarify") {
      // 条件が足りない：無理に10案を埋めず、補足を求める（入力は保持）
      update((d) => ({ ...d, clarify: { issues: outcome.issues, answers: {} } }));
      return;
    }
    update((d) => ({
      ...d,
      titles: { items: outcome.items, generatedAt: new Date().toISOString(), isSample: USING_SAMPLE_API },
      basis: { ...d.basis, titles: newFingerprint.titles(d, keywords) },
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

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          {missing.length > 0 ? (
            <StepLinks title="生成の前に、次の項目を確認してください。" items={missing} locked={locked} onGo={goToStep} tone="error" />
          ) : (
            <div className="flex flex-col gap-1 text-sm text-slate-700">
              {isBlank(draft.plan.summary) && <p>構成・内容要約が未入力のため、「企画段階のタイトル候補」として生成します。</p>}
              {draft.topRefs.length === 0 && <p>上位タイトルが未登録のため、参考比較を省略して生成します。</p>}
            </div>
          )}
          {staleSteps.length > 0 && (
            <StepLinks title="再確認が必要な工程があります（生成はできます）。" items={staleSteps} locked={locked} onGo={goToStep} tone="warn" />
          )}
          <div>
            <AiButton label={result ? "タイトルを10案生成し直す" : "タイトルを10案生成する"} busyLabel="生成中…"
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
              まだ生成していません。条件を確認して「タイトルを10案生成する」を押してください。
            </p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {recheck.titles && (
              <StaleNotice title="変更前の条件で生成" message="生成したあとに条件が変わりました。下の候補は閲覧・コピーできますが、今の条件に合わせるには生成し直してください。" />
            )}
            {result.isSample && <SampleNotice />}
            {isBlank(draft.plan.summary) && <p className="text-xs font-bold text-slate-600">企画段階のタイトル候補</p>}

            <ViewTabs view={view} setView={setView} titleLabel={`タイトル候補 ${result.items.length}案`} refCount={draft.topRefs.length} />

            {view === "titles" ? (
              <>
                <IssueList issues={issues} />
                <ol className="flex flex-col gap-2">
                  {result.items.map((t, i) => (
                    <li key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[2rem_1fr_auto] md:items-center">
                      <span className="text-sm font-bold text-slate-500">{i + 1}</span>
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-bold text-slate-900">{t.text}</p>
                        <p className="text-xs text-slate-500">{countChars(t.text)}文字　｜　狙い：{t.aim}</p>
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
