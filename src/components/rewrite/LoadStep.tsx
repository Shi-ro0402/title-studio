"use client";

// リライト① 記事を読み込む

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { mergeSuggestion } from "@/components/shared/PlanFieldsEditor";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { Field, inputClass } from "@/components/ui/Field";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { rewriteFingerprint, rewriteRecheck } from "@/lib/staleness";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { countChars, isBlank, isHttpUrl } from "@/lib/text";
import { hasErrors, validateLoadStep } from "@/lib/validation";
import { isEditedAfterLoad } from "@/state/rewriteDraft";
import { BodyEditorModal } from "./BodyEditorModal";
import { useRewriteDraft } from "./useRewriteDraft";

export function LoadStep() {
  const { draft, keywords, locked, update } = useRewriteDraft();
  const fetcher = useAiRunner();
  const analyzer = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const errors = validateLoadStep(draft);
  const err = (key: string) => (showErrors ? errors[key] : undefined);

  const bodyCount = countChars(draft.body);
  const bodyOver = bodyCount > LIMITS.body;
  const urlValid = isHttpUrl(draft.url);

  // ---- 読み込む（ページ取得のみ。AI処理ではないので利用回数に数えない） ----
  const load = async () => {
    if (!urlValid) {
      setShowErrors(true);
      return;
    }
    if (isEditedAfterLoad(draft) && !window.confirm("編集した現在のタイトル・本文・見出しが、読み込んだ内容で置き換わります。よろしいですか？")) {
      return;
    }
    const result = await fetcher.run("本文を取得中", () => api.fetchArticle({ url: draft.url.trim() }));
    if (!result) return;
    const headings = result.headings.join("\n");
    update((d) => ({
      ...d,
      inputMethod: "url",
      loaded: { url: d.url.trim(), title: result.title, body: result.body, headings, imageCount: result.imageCount },
      currentTitle: result.title,
      body: result.body,
      headings,
    }));
  };

  // ---- 記事を分析する（AI利用1回） ----
  const analyze = async () => {
    const result = await analyzer.run("記事を分析中", () =>
      api.analyzeArticle({ currentTitle: draft.currentTitle, body: draft.body, headings: draft.headings, keywords }),
    );
    if (!result) return;
    update((d) => ({
      ...d,
      ...mergeSuggestion(d, result.plan),
      // 選択済みのキーワードは自動で上書きせず、候補として残す
      keywordCandidates: result.keywordCandidates,
      basis: { ...d.basis, analysis: rewriteFingerprint.analysis(d) },
    }));
  };

  const fetchFailed = fetcher.error !== null;
  const recheck = rewriteRecheck(draft, keywords);

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        {/* 記事URLと読み込み */}
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <Field id="rewrite-url" label="記事URL" required={false} error={err("url")}
            hint="一般公開されている記事のURL。読み込めない場合は、下の欄にタイトルと本文を貼り付けて続けられます。">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="rewrite-url" type="url" className={inputClass} value={draft.url} disabled={locked}
                placeholder="https://" aria-invalid={err("url") ? true : undefined}
                onChange={(e) => update((d) => ({ ...d, url: e.target.value }))} />
              <button type="button" onClick={load} disabled={locked || isBlank(draft.url)}
                className="shrink-0 rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                {fetcher.running ? "取得中…" : "読み込む"}
              </button>
            </div>
          </Field>
          <p className="text-xs text-slate-500">
            「読み込む」はページの取得だけを行い、AIの利用回数は減りません。リンク先の別ページや、画像内の文字は読み込みません。
          </p>
          <AiError message={fetcher.error} onRetry={load} />
          {fetchFailed && (
            <p className="text-sm text-slate-700">下の欄にタイトルと本文を貼り付けて、続けることもできます。</p>
          )}
          {draft.loaded && !recheck.url && !fetcher.running && (
            <div className="rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-900">
              <p>
                読み込みました。メニュー・広告・関連記事などは除いています。抜けている部分があれば、下の本文欄で補足してください。
              </p>
              {draft.loaded.imageCount > 0 && (
                <p className="mt-1 font-bold">
                  本文中の画像 {draft.loaded.imageCount}件は確認していません。画像内の文字や図表に大事な内容があれば、文章で補足してください。
                </p>
              )}
            </div>
          )}
          {recheck.url && (
            <StaleNotice
              title="URLが変更されています（未読み込み）"
              message={`下の内容は、変更前のURL（${draft.loaded?.url}）から読み込んだものです。新しいURLの記事として扱うには「読み込む」を押すか、本文を貼り付け直してください。順位・上位比較・改善案も新しい記事で確認し直してください。`}
            />
          )}
          <button type="button" disabled={locked}
            onClick={() => {
              update((d) => ({ ...d, inputMethod: "paste" }));
              document.getElementById("rewrite-title")?.focus();
            }}
            className="w-fit text-sm text-teal-800 underline disabled:opacity-50">
            読み込めない場合は本文を貼り付ける
          </button>
          {/* 将来機能：保存した記事を選んで読み込む（初版は準備中の導線だけ） */}
          <button type="button" disabled
            className="w-fit cursor-not-allowed rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400">
            保存記事から選ぶ（準備中）
          </button>
        </div>

        {/* 取得・貼り付けた内容の確認と編集 */}
        <div className="flex flex-col gap-4">
          <Field id="rewrite-title" label="現在のタイトル" required max={LIMITS.currentTitle} value={draft.currentTitle}
            error={err("currentTitle") ?? (countChars(draft.currentTitle) > LIMITS.currentTitle ? errors.currentTitle : undefined)}>
            <input id="rewrite-title" className={inputClass} value={draft.currentTitle} disabled={locked}
              onChange={(e) => update((d) => ({ ...d, currentTitle: e.target.value }))} />
          </Field>

          <div className="flex flex-col gap-1">
            <Field id="rewrite-body" label="本文" required error={err("body") ?? (bodyOver ? errors.body : undefined)}
              hint="タイトル改善の根拠になります。メニュー・広告・関連記事などは含めないでください。">
              <textarea id="rewrite-body" rows={8} className={inputClass} value={draft.body} disabled={locked}
                aria-invalid={bodyOver ? true : undefined}
                onChange={(e) => update((d) => ({ ...d, body: e.target.value }))} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setEditorOpen(true)} disabled={locked}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50">
                本文を広げて編集
              </button>
              <p className={`text-xs ${bodyOver ? "font-bold text-red-700" : "text-slate-500"}`}>
                {bodyCount.toLocaleString()}／{LIMITS.body.toLocaleString()}文字
                {bodyOver && `（${(bodyCount - LIMITS.body).toLocaleString()}文字超過）`}
              </p>
            </div>
          </div>

          <Field id="rewrite-headings" label="抽出見出し" required={false} hint="1行に1つ。編集できます。">
            <textarea id="rewrite-headings" rows={4} className={inputClass} value={draft.headings} disabled={locked}
              onChange={(e) => update((d) => ({ ...d, headings: e.target.value }))} />
          </Field>

          <div className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            <p>作業内容は一時保持です。モード・工程の切り替えでは残りますが、ページの再読み込み・終了でリセットされます。生成に成功した結果だけを履歴に残します。</p>
            <p>画像内の情報は解析対象外です。必要な内容は文章で補足してください。</p>
          </div>
        </div>

        {/* AIによる記事分析 */}
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">記事を分析する</h2>
              <p className="text-xs text-slate-500">
                本文から、テーマ・要約・ペルソナ・検索目的・キーワード候補などを推定します。結果は③条件確認で確認・修正できます。
              </p>
            </div>
            <AiButton label="記事を分析する" busyLabel="分析中…" running={analyzer.running}
              disabled={isBlank(draft.body) || bodyOver} onClick={analyze} />
          </div>
          {isBlank(draft.body) && <p className="text-xs text-slate-500">本文を読み込むか貼り付けると、分析できます。</p>}
          {bodyOver && <p className="text-xs text-red-700">本文が{LIMITS.body.toLocaleString()}文字以内になると、分析できます。</p>}
          <AiError message={analyzer.error} onRetry={analyze} />
          {recheck.analysis && (
            <StaleNotice title="本文変更後、未確認" message="分析したあとに、現在のタイトル・本文・見出しが変わりました。②のキーワード候補と③のAI推定は変更前の内容にもとづいています。必要に応じて再分析してください。" />
          )}
          {draft.keywordCandidates && (
            <div className="flex flex-col gap-2">
              <SampleNotice />
              <p className="text-sm text-slate-700">
                分析が完了しました。推定したキーワード候補は②、企画情報は③で確認できます。
              </p>
            </div>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return !hasErrors(validateLoadStep(draft));
        }}
      />

      {editorOpen && (
        <BodyEditorModal
          initialBody={draft.body}
          onApply={(body) => update((d) => ({ ...d, body }))}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
