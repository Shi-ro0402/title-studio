"use client";

// 新規③ 上位分析

import { useState } from "react";
import { StepFooter } from "@/components/layout/StepFooter";
import { StepHeading } from "@/components/layout/StepPlaceholder";
import { AiButton, AiError, useAiRunner } from "@/components/ui/AiButton";
import { inputClass } from "@/components/ui/Field";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { validateTopStep } from "@/lib/validation";
import { newId, nowLocalString, type TopRef } from "@/state/newDraft";
import { useNewDraft } from "./useNewDraft";

export function TopStep() {
  const { draft, keywords, locked, update } = useNewDraft();
  const ai = useAiRunner();
  const [showErrors, setShowErrors] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const errors = validateTopStep(draft);
  const refsValid = Object.keys(errors).length === 0;

  const addRef = () =>
    update((d) => ({
      ...d,
      topRefs: [
        ...d.topRefs,
        { id: newId(), rank: String(d.topRefs.length + 1), title: "", url: "", checkedAt: nowLocalString() },
      ],
    }));

  const editRef = (id: string, patch: Partial<TopRef>) =>
    update((d) => ({ ...d, topRefs: d.topRefs.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const removeRef = (id: string) => update((d) => ({ ...d, topRefs: d.topRefs.filter((r) => r.id !== id) }));

  const analyze = async () => {
    setShowErrors(true);
    if (!refsValid || draft.topRefs.length === 0) return;
    const result = await ai.run("上位タイトルを分析中", () =>
      api.analyzeTop({
        mainKeyword: keywords.main ?? "",
        refs: draft.topRefs.map((r) => ({ id: r.id, title: r.title.trim() })),
      }),
    );
    if (result) {
      update((d) => ({ ...d, trend: result }));
      setSelectedCategory(null);
    }
  };

  const googleUrl = keywords.main
    ? `https://www.google.com/search?q=${encodeURIComponent(keywords.main)}`
    : null;
  const selected = draft.trend?.find((c) => c.name === selectedCategory) ?? null;

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-6">
        <StepHeading />

        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">Googleで検索して、上位のタイトルを手入力</p>
          {googleUrl ? (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
            >
              「{keywords.main}」をGoogleで検索 ↗
            </a>
          ) : (
            <p className="text-sm text-slate-600">主キーワードを設定すると、検索リンクが表示されます。</p>
          )}
          <p className="text-xs text-slate-500">
            広告・AIによる概要・地図などの検索枠は除き、自然検索の結果だけを登録してください。自動取得はしません。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              利用者が登録した検索上位{" "}
              <span className="text-sm font-normal text-slate-500">
                {draft.topRefs.length}／最大{LIMITS.topRefs}件（任意）
              </span>
            </h2>
            <button
              type="button"
              onClick={addRef}
              disabled={locked || draft.topRefs.length >= LIMITS.topRefs}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ＋ 上位タイトルを追加
            </button>
          </div>

          {draft.topRefs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
              登録がない場合は、上位タイトルの参考分析を省略して進みます。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {draft.topRefs.map((r, index) => {
                const err = (key: string) => (showErrors ? errors[`ref.${r.id}.${key}`] : undefined);
                const prefix = `ref-${r.id}`;
                return (
                  <li key={r.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500">登録 {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeRef(r.id)}
                        disabled={locked}
                        className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[5rem_1fr]">
                      <div>
                        <label htmlFor={`${prefix}-rank`} className="text-xs text-slate-600">順位</label>
                        <input id={`${prefix}-rank`} inputMode="numeric" className={inputClass} value={r.rank} disabled={locked}
                          aria-invalid={err("rank") ? true : undefined}
                          onChange={(e) => editRef(r.id, { rank: e.target.value })} />
                        {err("rank") && <p className="mt-1 text-xs text-red-700">{err("rank")}</p>}
                      </div>
                      <div>
                        <label htmlFor={`${prefix}-title`} className="text-xs text-slate-600">表示タイトル</label>
                        <input id={`${prefix}-title`} className={inputClass} value={r.title} disabled={locked}
                          aria-invalid={err("title") ? true : undefined}
                          onChange={(e) => editRef(r.id, { title: e.target.value })} />
                        {err("title") && <p className="mt-1 text-xs text-red-700">{err("title")}</p>}
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
                      <div>
                        <label htmlFor={`${prefix}-url`} className="text-xs text-slate-600">URL</label>
                        <input id={`${prefix}-url`} type="url" className={inputClass} value={r.url} disabled={locked}
                          placeholder="https://"
                          aria-invalid={err("url") ? true : undefined}
                          onChange={(e) => editRef(r.id, { url: e.target.value })} />
                        {err("url") && <p className="mt-1 text-xs text-red-700">{err("url")}</p>}
                      </div>
                      <div>
                        <label htmlFor={`${prefix}-checked`} className="text-xs text-slate-600">確認日時</label>
                        <input id={`${prefix}-checked`} type="datetime-local" className={inputClass} value={r.checkedAt} disabled={locked}
                          aria-invalid={err("checkedAt") ? true : undefined}
                          onChange={(e) => editRef(r.id, { checkedAt: e.target.value })} />
                        {err("checkedAt") && <p className="mt-1 text-xs text-red-700">{err("checkedAt")}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">傾向の分析</h2>
              <p className="text-xs text-slate-500">
                状態：{ai.running ? "分析中" : draft.trend ? `分析済み（${draft.topRefs.length}件を分析）` : "分析前"}
              </p>
            </div>
            <AiButton
              label="上位タイトルを分析する"
              busyLabel="分析中…"
              running={ai.running}
              disabled={draft.topRefs.length === 0}
              onClick={analyze}
            />
          </div>
          {draft.topRefs.length > 0 && draft.topRefs.length < LIMITS.topRefs && (
            <p className="text-xs text-slate-500">登録された{draft.topRefs.length}件で分析します。</p>
          )}
          <AiError message={ai.error} onRetry={analyze} />
          {draft.trend && (
            <div className="flex flex-col gap-3">
              <SampleNotice />
              <p className="text-sm font-bold text-slate-800">タイトルから推定した傾向</p>
              <div className="flex flex-wrap gap-2">
                {draft.trend.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={selectedCategory === c.name}
                    onClick={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      selectedCategory === c.name
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {c.name}（{c.refIds.length}）
                  </button>
                ))}
              </div>
              {selected && (
                <ul className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-sm">
                  {selected.refIds.map((id) => {
                    const ref = draft.topRefs.find((r) => r.id === id);
                    if (!ref) return null;
                    return (
                      <li key={id}>
                        <span className="mr-2 text-slate-500">{ref.rank}位</span>
                        {ref.title}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-slate-500">
                参考記事の本文は確認していません。カテゴリをそのまま採用せず、自分の記事内容との一致を優先してください。
              </p>
            </div>
          )}
        </div>
      </section>

      <StepFooter
        onBeforeNext={() => {
          setShowErrors(true);
          return Object.keys(validateTopStep(draft)).length === 0;
        }}
      />
    </>
  );
}
