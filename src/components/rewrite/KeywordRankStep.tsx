"use client";

// リライト② キーワードと順位

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { SubKeywordEditor } from "@/components/shared/SubKeywordEditor";
import { useKeywordOps } from "@/components/shared/useKeywordOps";
import { Field, RequiredBadge, inputClass } from "@/components/ui/Field";
import { RESEARCH_SITES } from "@/lib/externalLinks";
import { LIMITS } from "@/lib/limits";
import { hasErrors, validateRewriteKeywordStep } from "@/lib/validation";
import { SOURCE_LABEL, type Candidate } from "@/state/newDraft";
import { RANK_STATUS_LABEL, type RankRecord, type RankStatus, type RewriteDraft } from "@/state/rewriteDraft";
import { useRewriteDraft } from "./useRewriteDraft";

export function KeywordRankStep() {
  const { draft, locked, update } = useRewriteDraft();
  const { keywords, setMain, addSub } = useKeywordOps("rewrite");
  const [showErrors, setShowErrors] = useState(false);
  const [mainInput, setMainInput] = useState("");
  const [mainError, setMainError] = useState<string | null>(null);
  const errors = validateRewriteKeywordStep(draft, keywords);
  const rank = draft.rank;

  const editRank = (patch: Partial<RankRecord>) => update((d) => ({ ...d, rank: { ...d.rank, ...patch } }));
  const editDemand = (patch: Partial<RewriteDraft["demand"]>) => update((d) => ({ ...d, demand: { ...d.demand, ...patch } }));

  const submitMain = (word: string) => {
    const message = setMain(word);
    setMainError(message);
    if (!message) setMainInput("");
  };

  const googleUrl = keywords.main ? `https://www.google.com/search?q=${encodeURIComponent(keywords.main)}` : null;

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        {/* 対象キーワード */}
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">主キーワード</h2>
            <RequiredBadge required />
          </div>
          <p className="text-sm">
            {keywords.main ? <span className="font-bold text-slate-900">{keywords.main}</span> : <span className="text-slate-500">未設定</span>}
          </p>
          {showErrors && errors.main && <p className="text-sm text-red-700">{errors.main}</p>}

          <Field id="rewrite-main-input" label={keywords.main ? "主キーワードを変更する" : "主キーワードを入力"} required={false}
            max={LIMITS.keyword} value={mainInput} error={mainError}>
            <div className="flex gap-2">
              <input id="rewrite-main-input" className={inputClass} value={mainInput} disabled={locked}
                onChange={(e) => setMainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitMain(mainInput);
                  }
                }} />
              <button type="button" disabled={locked} onClick={() => submitMain(mainInput)}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50">
                主に設定
              </button>
            </div>
          </Field>

          {draft.keywordCandidates && draft.keywordCandidates.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                記事から推定したキーワード候補
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-800">AI推定</span>
              </p>
              <p className="text-xs text-slate-500">選択済みのキーワードは自動で置き換えません。採用する場合はボタンを押してください。</p>
              <ul className="flex flex-col gap-2">
                {draft.keywordCandidates.map((word) => {
                  const isMain = keywords.main === word;
                  const isSub = keywords.sub.includes(word);
                  return (
                    <li key={word} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-40 text-slate-900">{word}</span>
                      <button type="button" disabled={locked || isMain} onClick={() => submitMain(word)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs disabled:opacity-60">
                        {isMain ? "✓ 主に設定済み" : "主に設定"}
                      </button>
                      <button type="button" disabled={locked || isMain || isSub || keywords.sub.length >= LIMITS.subKeywords}
                        onClick={() => {
                          const message = addSub(word);
                          if (message) window.alert(message);
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs disabled:opacity-60">
                        {isSub ? "✓ 補助に追加済み" : "補助に追加"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <SubKeywordEditor mode="rewrite" />

        {/* 検索需要（補助機能） */}
        <details className="rounded-md border border-slate-200 p-4">
          <summary className="cursor-pointer text-base font-bold text-slate-900">検索需要を調べる（任意）</summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {RESEARCH_SITES.map((site) => (
                <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100">
                  {site.name} を開く ↗
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500">別のタブで調べ、主キーワードの検索数を手入力します。未入力と0は区別します。</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Field id="demand-volume" label="検索数" required={false} error={errors.volume}>
                <input id="demand-volume" inputMode="numeric" className={inputClass} placeholder="未入力" value={draft.demand.volume}
                  disabled={locked} onChange={(e) => editDemand({ volume: e.target.value })} />
              </Field>
              <Field id="demand-source" label="調査元" required={false}>
                <select id="demand-source" className={inputClass} value={draft.demand.source} disabled={locked}
                  onChange={(e) => editDemand({ source: e.target.value as Candidate["source"] })}>
                  {(Object.keys(SOURCE_LABEL) as Candidate["source"][]).map((key) => (
                    <option key={key} value={key}>{SOURCE_LABEL[key]}</option>
                  ))}
                </select>
              </Field>
              <Field id="demand-date" label="確認日" required={false}>
                <input id="demand-date" type="date" className={inputClass} value={draft.demand.checkedOn} disabled={locked}
                  onChange={(e) => editDemand({ checkedOn: e.target.value })} />
              </Field>
            </div>
          </div>
        </details>

        {/* 現在の検索順位（任意） */}
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">現在の検索順位</h2>
            <RequiredBadge required={false} />
          </div>
          <p className="text-xs text-slate-500">
            Googleを別のタブで開いて手動で確認します（自動取得はしません）。未入力でも進めます。順位は参考情報で、改善効果を断定するものではありません。
          </p>
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer"
              className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100">
              「{keywords.main}」をGoogleで検索 ↗
            </a>
          )}

          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-1 text-sm font-bold text-slate-800">確認結果</legend>
            {(Object.keys(RANK_STATUS_LABEL) as RankStatus[]).map((status) => (
              <label key={status} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="rank-status" checked={rank.status === status} disabled={locked}
                  onChange={() => editRank({ status })} />
                {RANK_STATUS_LABEL[status]}
              </label>
            ))}
          </fieldset>

          {rank.status !== "unchecked" && (
            <div className="grid gap-3 md:grid-cols-2">
              {rank.status === "ranked" ? (
                <Field id="rank-value" label="順位" required={false} error={showErrors ? errors.rank : undefined}>
                  <input id="rank-value" inputMode="numeric" className={inputClass} value={rank.rank} disabled={locked}
                    onChange={(e) => editRank({ rank: e.target.value })} />
                </Field>
              ) : (
                <Field id="rank-range" label="確認した範囲" required={false} hint="例：上位100位まで">
                  <input id="rank-range" className={inputClass} value={rank.range} disabled={locked}
                    onChange={(e) => editRank({ range: e.target.value })} />
                </Field>
              )}
              <Field id="rank-checked" label="確認日時" required={false}>
                <input id="rank-checked" type="datetime-local" className={inputClass} value={rank.checkedAt} disabled={locked}
                  onChange={(e) => editRank({ checkedAt: e.target.value })} />
              </Field>
              <Field id="rank-country" label="国" required={false}>
                <input id="rank-country" className={inputClass} value={rank.country} disabled={locked}
                  onChange={(e) => editRank({ country: e.target.value })} />
              </Field>
              <Field id="rank-language" label="言語" required={false}>
                <input id="rank-language" className={inputClass} value={rank.language} disabled={locked}
                  onChange={(e) => editRank({ language: e.target.value })} />
              </Field>
              <Field id="rank-region" label="地域" required={false} hint="例：東京都（指定していなければ空欄）">
                <input id="rank-region" className={inputClass} value={rank.region} disabled={locked}
                  onChange={(e) => editRank({ region: e.target.value })} />
              </Field>
              <Field id="rank-device" label="端末" required={false}>
                <select id="rank-device" className={inputClass} value={rank.device} disabled={locked}
                  onChange={(e) => editRank({ device: e.target.value as RankRecord["device"] })}>
                  <option value="">未選択</option>
                  <option value="pc">PC</option>
                  <option value="mobile">スマートフォン</option>
                </select>
              </Field>
              <Field id="rank-source" label="確認元" required={false}>
                <input id="rank-source" className={inputClass} value={rank.source} disabled={locked}
                  onChange={(e) => editRank({ source: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return !hasErrors(validateRewriteKeywordStep(draft, keywords));
        }}
      />
    </>
  );
}
