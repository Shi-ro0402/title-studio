"use client";

// 新規① キーワード調査と選定

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { Field, RequiredBadge, inputClass } from "@/components/ui/Field";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { countChars, isBlank } from "@/lib/text";
import { validateKeywordStep } from "@/lib/validation";
import { SOURCE_LABEL, newId, todayString, type Candidate } from "@/state/newDraft";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";
import { useNewDraft } from "./useNewDraft";

const RESEARCH_SITES = [
  { name: "aramakijake.jp", url: "https://aramakijake.jp/" },
  { name: "Ubersuggest", url: "https://neilpatel.com/jp/ubersuggest/" },
];

export function KeywordStep() {
  const { draft, keywords, locked, update, setKeywords } = useNewDraft();
  const workspace = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [subError, setSubError] = useState<string | null>(null);

  const errors = validateKeywordStep(draft, keywords);
  const visibleError = (key: string) => (showErrors ? errors[key] : undefined);
  const filledCandidates = draft.candidates.filter((c) => !isBlank(c.keyword));

  // ---- 調査候補の編集 ----
  const addCandidate = () =>
    update((d) => ({
      ...d,
      candidates: [
        ...d.candidates,
        { id: newId(), keyword: "", volume: "", source: "", checkedOn: todayString() },
      ],
    }));

  const editCandidate = (id: string, patch: Partial<Candidate>) =>
    update((d) => ({
      ...d,
      candidates: d.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const removeCandidate = (id: string) =>
    update((d) => ({ ...d, candidates: d.candidates.filter((c) => c.id !== id) }));

  // ---- 主・補助キーワードの選択 ----
  const setMain = (word: string) => {
    const value = word.trim();
    if (!value || value === keywords.main) return;
    if (countChars(value) > LIMITS.keyword) return;
    const inSub = keywords.sub.includes(value);
    const messages: string[] = [];
    if (keywords.main) {
      messages.push(
        `主キーワードを「${keywords.main}」から「${value}」に変更します。`,
        "以前の主キーワードは補助キーワードに移りません。",
      );
    }
    if (inSub) messages.push(`「${value}」は補助キーワードから外れます。`);
    if (messages.length > 0 && !window.confirm(`${messages.join("\n")}\nよろしいですか？`)) return;
    setKeywords({ main: value, sub: keywords.sub.filter((s) => s !== value) });
  };

  const addSub = (word: string): string | null => {
    const value = word.trim();
    if (!value) return "補助キーワードを入力してください。";
    if (countChars(value) > LIMITS.keyword) return `${LIMITS.keyword}文字以内で入力してください。`;
    if (value === keywords.main) return "主キーワードと同じ語は、補助キーワードに登録できません。";
    if (keywords.sub.includes(value)) return "すでに補助キーワードに追加されています。";
    if (keywords.sub.length >= LIMITS.subKeywords)
      return `補助キーワードは最大${LIMITS.subKeywords}個までです。`;
    setKeywords({ ...keywords, sub: [...keywords.sub, value] });
    return null;
  };

  const removeSub = (word: string) =>
    setKeywords({ ...keywords, sub: keywords.sub.filter((s) => s !== word) });

  // ---- AI分析 ----
  const analyze = async () => {
    const words = filledCandidates.map((c) => c.keyword.trim());
    const result = await ai.run("候補を分析中", () => api.analyzeKeywords({ keywords: words }));
    if (result) update((d) => ({ ...d, keywordInsights: result }));
  };

  const handoff = () => {
    const target = workspace.modes.rewrite.keywords;
    const hasValue = target.main !== null || target.sub.length > 0;
    if (
      hasValue &&
      !window.confirm(
        "リライト側にはすでにキーワードが設定されています。新規作成の主・補助キーワードで置き換えますか？",
      )
    )
      return;
    dispatch({ type: "handoffToRewrite" });
  };

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        {/* 1. 外部サイトで調べる */}
        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">外部サイトで調べる → 下の欄へ手入力</p>
          <div className="flex flex-wrap gap-2">
            {RESEARCH_SITES.map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
              >
                {site.name} を開く ↗
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            別のタブで開きます。調査結果の自動取得はしません。検索数は各サービスが示す需要の目安です。
          </p>
        </div>

        {/* 2. 調査候補 */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              調査候補 <span className="text-sm font-normal text-slate-500">{draft.candidates.length}／{LIMITS.candidates}件</span>
            </h2>
            <button
              type="button"
              onClick={addCandidate}
              disabled={locked || draft.candidates.length >= LIMITS.candidates}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ＋ 候補を追加
            </button>
          </div>

          {draft.candidates.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              「候補を追加」で、調べたキーワードを入力してください（最大{LIMITS.candidates}件）。
            </p>
          ) : (
            <>
              {/* PC：表の見出し */}
              <div className="hidden grid-cols-[2fr_1fr_1.2fr_1.2fr_auto] gap-2 px-1 text-xs font-bold text-slate-600 md:grid">
                <span>キーワード（必須）</span>
                <span>検索数（任意）</span>
                <span>調査元</span>
                <span>確認日</span>
                <span className="w-16" />
              </div>
              <ul className="flex flex-col gap-3">
                {draft.candidates.map((c, index) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    index={index}
                    locked={locked}
                    isMain={!isBlank(c.keyword) && keywords.main === c.keyword.trim()}
                    isSub={keywords.sub.includes(c.keyword.trim())}
                    keywordError={visibleError(`candidate.${c.id}.keyword`) ?? (countChars(c.keyword) > LIMITS.keyword ? errors[`candidate.${c.id}.keyword`] : undefined)}
                    volumeError={errors[`candidate.${c.id}.volume`]}
                    onChange={(patch) => editCandidate(c.id, patch)}
                    onRemove={() => removeCandidate(c.id)}
                    onSetMain={() => setMain(c.keyword)}
                    onAddSub={() => {
                      const message = addSub(c.keyword);
                      if (message) window.alert(message);
                    }}
                    subFull={keywords.sub.length >= LIMITS.subKeywords}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 3. 候補の分析 */}
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">候補の分析</h2>
              <p className="text-xs text-slate-500">
                状態：{ai.running ? "分析中" : draft.keywordInsights ? "分析済み" : "分析前"}
              </p>
            </div>
            <AiButton
              label="候補を分析する"
              busyLabel="分析中…"
              running={ai.running}
              disabled={filledCandidates.length === 0}
              onClick={analyze}
            />
          </div>
          {filledCandidates.length === 0 && (
            <p className="text-xs text-slate-500">キーワードを1件以上入力すると分析できます。</p>
          )}
          <AiError message={ai.error} onRetry={analyze} />
          {draft.keywordInsights && (
            <div className="flex flex-col gap-3">
              <SampleNotice />
              <p className="text-xs text-slate-500">
                検索数は手入力の調査値です。AIは検索数を補完しません。ペルソナとの関連性は、記事企画で読者を設定したあとに確認できます。
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {draft.keywordInsights.map((insight, i) => (
                  <li key={`${i}-${insight.keyword}`} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      {insight.keyword}
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-800">AI推定</span>
                    </p>
                    <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 text-slate-700">
                      <dt className="text-slate-500">推定検索意図</dt>
                      <dd>{insight.intent}</dd>
                      <dt className="text-slate-500">関連性</dt>
                      <dd>{insight.relevance}</dd>
                      <dt className="text-slate-500">記事の切り口</dt>
                      <dd>{insight.angle}</dd>
                      <dt className="text-slate-500">理由</dt>
                      <dd>{insight.reason}</dd>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4. 選択結果 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">主キーワード</h2>
              <RequiredBadge required />
              <span className="text-xs text-slate-500">1つ</span>
            </div>
            {keywords.main ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                <span className="text-sm font-bold text-slate-900">{keywords.main}</span>
                <button
                  type="button"
                  onClick={() => setKeywords({ ...keywords, main: null })}
                  disabled={locked}
                  className="text-xs text-slate-600 underline disabled:opacity-50"
                >
                  解除
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">調査候補の「主に設定」で選んでください。</p>
            )}
            {visibleError("main") && <p className="text-sm text-red-700">{errors.main}</p>}
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">補助キーワード</h2>
              <RequiredBadge required={false} />
              <span className="text-xs text-slate-500">
                {keywords.sub.length}／最大{LIMITS.subKeywords}個
              </span>
            </div>
            {keywords.sub.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {keywords.sub.map((s) => (
                  <li key={s} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSub(s)}
                      disabled={locked}
                      aria-label={`${s} を補助キーワードから外す`}
                      className="rounded-full px-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">なし（未入力でも進めます）</p>
            )}
            <Field
              id="sub-input"
              label="補助キーワードを手入力"
              required={false}
              max={LIMITS.keyword}
              value={subInput}
              error={subError}
            >
              <div className="flex gap-2">
                <input
                  id="sub-input"
                  className={inputClass}
                  value={subInput}
                  disabled={locked || keywords.sub.length >= LIMITS.subKeywords}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      const message = addSub(subInput);
                      setSubError(message);
                      if (!message) setSubInput("");
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={locked || keywords.sub.length >= LIMITS.subKeywords}
                  onClick={() => {
                    const message = addSub(subInput);
                    setSubError(message);
                    if (!message) setSubInput("");
                  }}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  追加
                </button>
              </div>
            </Field>
          </div>
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return Object.keys(validateKeywordStep(draft, keywords)).length === 0;
        }}
        extra={
          <button
            type="button"
            onClick={handoff}
            disabled={locked || !keywords.main}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            このキーワードでリライト
          </button>
        }
      />
    </>
  );
}

type CandidateRowProps = {
  candidate: Candidate;
  index: number;
  locked: boolean;
  isMain: boolean;
  isSub: boolean;
  subFull: boolean;
  keywordError?: string;
  volumeError?: string;
  onChange: (patch: Partial<Candidate>) => void;
  onRemove: () => void;
  onSetMain: () => void;
  onAddSub: () => void;
};

/** 調査候補1件。PCでは表の1行、スマートフォンでは1枚のカードとして表示する */
function CandidateRow({
  candidate: c,
  index,
  locked,
  isMain,
  isSub,
  subFull,
  keywordError,
  volumeError,
  onChange,
  onRemove,
  onSetMain,
  onAddSub,
}: CandidateRowProps) {
  const prefix = `candidate-${c.id}`;
  const blank = isBlank(c.keyword);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 md:border-0 md:p-1">
      <p className="text-xs font-bold text-slate-500 md:hidden">候補 {index + 1}</p>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1.2fr_1.2fr_auto] md:items-start">
        <div>
          <label htmlFor={`${prefix}-keyword`} className="text-xs text-slate-600 md:sr-only">
            キーワード（必須）
          </label>
          <input
            id={`${prefix}-keyword`}
            className={inputClass}
            value={c.keyword}
            disabled={locked}
            placeholder="例：webライター 未経験"
            aria-invalid={keywordError ? true : undefined}
            onChange={(e) => onChange({ keyword: e.target.value })}
          />
          {keywordError && <p className="mt-1 text-xs text-red-700">{keywordError}</p>}
        </div>
        <div>
          <label htmlFor={`${prefix}-volume`} className="text-xs text-slate-600 md:sr-only">
            検索数（任意）
          </label>
          <input
            id={`${prefix}-volume`}
            className={inputClass}
            value={c.volume}
            disabled={locked}
            inputMode="numeric"
            placeholder="未入力"
            aria-invalid={volumeError ? true : undefined}
            onChange={(e) => onChange({ volume: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">{c.volume.trim() === "" ? "未入力" : c.volume.trim() === "0" ? "0（調査結果が0）" : ""}</p>
          {volumeError && <p className="text-xs text-red-700">{volumeError}</p>}
        </div>
        <div>
          <label htmlFor={`${prefix}-source`} className="text-xs text-slate-600 md:sr-only">
            調査元
          </label>
          <select
            id={`${prefix}-source`}
            className={inputClass}
            value={c.source}
            disabled={locked}
            onChange={(e) => onChange({ source: e.target.value as Candidate["source"] })}
          >
            {(Object.keys(SOURCE_LABEL) as Candidate["source"][]).map((key) => (
              <option key={key} value={key}>
                {SOURCE_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${prefix}-date`} className="text-xs text-slate-600 md:sr-only">
            確認日
          </label>
          <input
            id={`${prefix}-date`}
            type="date"
            className={inputClass}
            value={c.checkedOn}
            disabled={locked}
            onChange={(e) => onChange({ checkedOn: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={locked}
          className="w-16 justify-self-end rounded-md px-2 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          削除
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSetMain}
          disabled={locked || blank || isMain}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMain ? "✓ 主に設定済み" : "主に設定"}
        </button>
        <button
          type="button"
          onClick={onAddSub}
          disabled={locked || blank || isMain || isSub || subFull}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSub ? "✓ 補助に追加済み" : "補助に追加"}
        </button>
      </div>
    </li>
  );
}
