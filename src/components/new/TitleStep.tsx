"use client";

// 新規④ タイトル候補

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { copyText, useToast } from "@/components/ui/Toast";
import { USING_SAMPLE_API, api } from "@/lib/api";
import { countChars, isBlank } from "@/lib/text";
import { checkTitles } from "@/lib/titleCheck";
import { validateKeywordStep, validatePlanStep, validateTopStep } from "@/lib/validation";
import { useNewDraft } from "./useNewDraft";

type Missing = { label: string; step: number };

export function TitleStep() {
  const { draft, keywords, locked, update, goToStep } = useNewDraft();
  const ai = useAiRunner();
  const toast = useToast();
  const [view, setView] = useState<"titles" | "refs">("titles");

  // 生成前に、必須情報がそろっているかを工程ごとに確認する
  const missing: Missing[] = [];
  if (Object.keys(validateKeywordStep(draft, keywords)).length > 0)
    missing.push({ label: "①キーワード：主キーワードの設定、または候補の入力内容", step: 0 });
  if (Object.keys(validatePlanStep(draft)).length > 0)
    missing.push({ label: "②記事企画：テーマ・ペルソナ・読者の疑問の入力、または文字数", step: 1 });
  if (Object.keys(validateTopStep(draft)).length > 0)
    missing.push({ label: "③上位分析：登録した上位タイトルの入力内容", step: 2 });

  const referenceTitles = draft.topRefs.map((r) => r.title);

  const generate = async () => {
    if (missing.length > 0) return;
    const result = await ai.run("タイトルを生成中", () =>
      api.generateTitles({ keywords, plan: draft.plan, tone: draft.tone, referenceTitles }),
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

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          {missing.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-slate-800">生成の前に、次の項目を確認してください。</p>
              <ul className="flex flex-col gap-1 text-sm">
                {missing.map((m) => (
                  <li key={m.step} className="flex flex-wrap items-center gap-2">
                    <span className="text-red-700">・{m.label}</span>
                    <button type="button" className="underline" disabled={locked} onClick={() => goToStep(m.step)}>
                      この工程へ移動
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-sm text-slate-700">
              {isBlank(draft.plan.summary) && <p>構成・内容要約が未入力のため、「企画段階のタイトル候補」として生成します。</p>}
              {draft.topRefs.length === 0 && <p>上位タイトルが未登録のため、参考比較を省略して生成します。</p>}
            </div>
          )}
          <div>
            <AiButton
              label="タイトルを10案生成する"
              busyLabel="生成中…"
              running={ai.running}
              disabled={missing.length > 0}
              onClick={generate}
            />
          </div>
          <AiError message={ai.error} onRetry={generate} />
        </div>

        {!result ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            まだ生成していません。条件を確認して「タイトルを10案生成する」を押してください。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {result.isSample && <SampleNotice />}
            {isBlank(draft.plan.summary) && (
              <p className="text-xs font-bold text-slate-600">企画段階のタイトル候補</p>
            )}

            <div role="tablist" aria-label="表示の切り替え" className="flex gap-2">
              <button type="button" role="tab" aria-selected={view === "titles"} onClick={() => setView("titles")}
                className={`rounded-md px-3 py-1.5 text-sm ${view === "titles" ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
                タイトル候補 {result.items.length}案
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
                      <li key={i}>
                        {issue.index !== null ? `${issue.index + 1}番目：` : ""}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
                <ol className="flex flex-col gap-2">
                  {result.items.map((t, i) => (
                    <li key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[2rem_1fr_auto] md:items-center">
                      <span className="text-sm font-bold text-slate-500">{i + 1}</span>
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-bold text-slate-900">{t.text}</p>
                        <p className="text-xs text-slate-500">
                          {countChars(t.text)}文字　｜　狙い：{t.aim}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(t.text)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                      >
                        コピー
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : draft.topRefs.length === 0 ? (
              <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-600">参考上位は登録されていません（参考比較を省略）。</p>
            ) : (
              <ul className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-sm">
                <li className="text-xs text-slate-500">利用者が登録した検索上位</li>
                {draft.topRefs.map((r) => (
                  <li key={r.id}>
                    <span className="mr-2 text-slate-500">{r.rank}位</span>
                    {r.title}
                  </li>
                ))}
              </ul>
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
