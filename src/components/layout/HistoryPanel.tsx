"use client";

/**
 * 履歴のサブ画面。PCは画面の半分程度、スマートフォンは全画面。
 * 一覧（代表タイトルと種別）と詳細（10案・生成条件）を同じサブ画面の中で切り替える。
 * 閉じると元のモード・工程へ戻る。履歴を開いても作業中の入力を上書き・復元しない。
 */

import { useEffect, useRef, useState } from "react";
import { copyText, useToast } from "@/components/ui/Toast";
import {
  HISTORY_LIMIT,
  clearHistory,
  deleteHistoryEntry,
  useHistory,
  type HistoryEntry,
} from "@/lib/history";
import { countChars } from "@/lib/text";
import { SOURCE_LABEL, TONE_LABEL, type Candidate, type Tone } from "@/state/newDraft";
import { RANK_STATUS_LABEL } from "@/state/rewriteDraft";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

type Filter = "all" | "new" | "rewrite";

const FILTER_LABEL: Record<Filter, string> = { all: "すべて", new: "新規", rewrite: "リライト" };

const PLAN_LABEL: Record<string, string> = {
  theme: "テーマ",
  persona: "ペルソナ",
  question: "読者の疑問・検索目的",
  summary: "構成・内容要約",
  strength: "記事の強み",
  improvement: "改善したい点",
};

export function HistoryPanel() {
  const { historyOpen } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const entries = useHistory();
  const toast = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const close = () => {
    setSelectedId(null);
    dispatch({ type: "closeHistory" });
  };

  useEffect(() => {
    if (!historyOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        dispatch({ type: "closeHistory" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen, dispatch]);

  if (!historyOpen) return null;

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const visible = entries.filter((e) => filter === "all" || e.mode === filter);

  const copy = async (text: string) => {
    const ok = await copyText(text);
    toast(ok ? "コピーしました" : "コピーできませんでした。タイトルを選択して手動でコピーしてください。", ok ? "success" : "error");
  };

  const removeOne = (entry: HistoryEntry) => {
    if (!window.confirm(`この履歴を削除します。元に戻せません。\n「${entry.titles[0]?.text ?? ""}」\nよろしいですか？`)) return;
    const ok = deleteHistoryEntry(entry.id);
    toast(ok ? "履歴を削除しました" : "履歴を削除できませんでした", ok ? "success" : "error");
    if (ok) setSelectedId(null);
  };

  const removeAll = () => {
    if (!window.confirm(`保存されている履歴${entries.length}件をすべて削除します。元に戻せません。\n（作業中の入力は消えません）\nよろしいですか？`)) return;
    const ok = clearHistory();
    toast(ok ? "履歴をすべて削除しました" : "履歴を削除できませんでした", ok ? "success" : "error");
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={close} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="relative flex h-full w-full flex-col bg-white shadow-xl md:w-1/2"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {selected && (
              <button type="button" onClick={() => setSelectedId(null)}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
                ← 一覧へ戻る
              </button>
            )}
            <h2 id="history-title" className="text-lg font-bold text-slate-900">
              {selected ? "履歴の詳細" : `履歴 ${entries.length}件`}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={close}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
            閉じる
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-700">
          {selected ? (
            <HistoryDetail entry={selected} onCopy={copy} onDelete={() => removeOne(selected)} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-600">
                生成に成功した結果を、新規・リライト合計で最新{HISTORY_LIMIT}件まで、このブラウザに保存します（{HISTORY_LIMIT}件を超えると古いものから消えます）。作業途中の内容は保存しません。
              </p>

              <div role="group" aria-label="絞り込み" className="flex gap-2">
                {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                  <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    {FILTER_LABEL[f]}
                  </button>
                ))}
              </div>

              {visible.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-slate-500">
                  {entries.length === 0 ? "まだ履歴はありません。" : `「${FILTER_LABEL[filter]}」の履歴はありません。`}
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    生成10案のうち先頭のタイトルを表示しています（採用したタイトルという意味ではありません）。選ぶと10案を確認できます。
                  </p>
                  <ul className="flex flex-col gap-2">
                    {visible.map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => setSelectedId(e.id)}
                          className="flex w-full items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
                          <ModeLabel mode={e.mode} />
                          <span className="text-sm text-slate-900">{e.titles[0]?.text ?? "（タイトルなし）"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {entries.length > 0 && (
                <div className="mt-2 border-t border-slate-200 pt-3">
                  <button type="button" onClick={removeAll}
                    className="rounded-md px-2 py-1 text-xs text-red-700 underline hover:bg-red-50">
                    履歴をすべて削除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ModeLabel({ mode }: { mode: HistoryEntry["mode"] }) {
  return mode === "new" ? (
    <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-bold text-indigo-800">新規</span>
  ) : (
    <span className="shrink-0 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-800">リライト</span>
  );
}

/** 順位を確認した条件（国・言語・地域・端末） */
function rankConditions(rank: NonNullable<HistoryEntry["rewrite"]>["rank"]): string {
  const device = rank.device === "pc" ? "PC" : rank.device === "mobile" ? "スマートフォン" : "";
  return [rank.country, rank.language, rank.region, device].filter(Boolean).join("・");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function HistoryDetail({ entry, onCopy, onDelete }: { entry: HistoryEntry; onCopy: (text: string) => void; onDelete: () => void }) {
  const rw = entry.rewrite;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ModeLabel mode={entry.mode} />
        <span className="text-xs text-slate-500">生成日時：{formatDate(entry.createdAt)}</span>
      </div>

      {rw && (
        <div className="rounded-md border-2 border-teal-200 bg-teal-50 p-3">
          <p className="text-xs text-slate-500">変更前のタイトル</p>
          <p className="font-bold text-slate-900">{rw.currentTitle || "（未入力）"}</p>
          {rw.url && <p className="mt-1 break-all text-xs text-slate-600">元記事：{rw.url}</p>}
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {entry.titles.map((t, i) => (
          <li key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1.5rem_1fr_auto] sm:items-start">
            <span className="text-sm font-bold text-slate-500">{i + 1}</span>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-slate-900">{t.text}</p>
              <p className="text-xs text-slate-500">{countChars(t.text)}文字　｜　狙い：{t.aim}</p>
              {t.improvement && <p className="text-xs text-slate-700"><span className="font-bold">改善ポイント：</span>{t.improvement}</p>}
              {t.evidence && <p className="text-xs text-slate-700"><span className="font-bold">本文の根拠：</span>{t.evidence}</p>}
            </div>
            <button type="button" onClick={() => onCopy(t.text)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 hover:bg-slate-50">
              コピー
            </button>
          </li>
        ))}
      </ol>

      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">保存した生成条件を見る</summary>
        <dl className="mt-3 grid gap-x-3 gap-y-2 text-xs sm:grid-cols-[9rem_1fr]">
          <dt className="text-slate-500">主キーワード</dt>
          <dd>{entry.keywords.main ?? "未設定"}</dd>
          <dt className="text-slate-500">補助キーワード</dt>
          <dd>{entry.keywords.sub.length ? entry.keywords.sub.join("、") : "なし"}</dd>
          {Object.entries(entry.plan).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-slate-500">{PLAN_LABEL[key] ?? key}</dt>
              <dd className="whitespace-pre-wrap">{value || "未入力"}</dd>
            </div>
          ))}
          <dt className="text-slate-500">トーン</dt>
          <dd>{TONE_LABEL[entry.tone as Tone] ?? entry.tone}</dd>
          <dt className="text-slate-500">調査した検索数</dt>
          <dd>
            {entry.research.length === 0 ? "なし" : (
              <ul>
                {entry.research.map((r, i) => (
                  <li key={i}>
                    {r.keyword}：{r.volume === "" ? "未入力" : r.volume}（{SOURCE_LABEL[r.source as Candidate["source"]] ?? r.source}{r.checkedOn ? `・${r.checkedOn}` : ""}）
                  </li>
                ))}
              </ul>
            )}
          </dd>
          <dt className="text-slate-500">参考上位</dt>
          <dd>
            {entry.refs.length === 0 ? "登録なし（参考比較を省略）" : (
              <ul>
                {entry.refs.map((r, i) => (
                  <li key={i}>{r.rank}位：{r.title}</li>
                ))}
              </ul>
            )}
          </dd>
          {rw && (
            <>
              <dt className="text-slate-500">検索順位</dt>
              <dd>
                {RANK_STATUS_LABEL[rw.rank.status]}
                {rw.rank.status === "ranked" && rw.rank.rank ? `（${rw.rank.rank}位）` : ""}
                {rw.rank.checkedAt ? `・確認 ${rw.rank.checkedAt.replace("T", " ")}` : ""}
                {rankConditions(rw.rank) && `（${rankConditions(rw.rank)}）`}
                {(rw.rank.status === "out" || rw.rank.status === "notfound") && rw.rank.range ? `・確認範囲：${rw.rank.range}` : ""}
              </dd>
            </>
          )}
        </dl>
      </details>

      {rw && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          本文は保存されていません。再分析する場合はURLを読み込むか本文を貼り付けてください。
        </p>
      )}
      <p className="text-xs text-slate-500">履歴を見ても、今の作業内容は変わりません。</p>

      <div className="border-t border-slate-200 pt-3">
        <button type="button" onClick={onDelete}
          className="rounded-md px-2 py-1 text-xs text-red-700 underline hover:bg-red-50">
          この履歴を削除
        </button>
      </div>
    </div>
  );
}
