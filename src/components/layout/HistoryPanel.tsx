"use client";

import { useEffect, useRef } from "react";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

/**
 * 履歴のサブ画面（骨組み）。PCは画面の半分程度、スマートフォンは全画面。
 * 一覧・詳細・削除は段階7で実装する。閉じると元のモード・工程へ戻る。
 */
export function HistoryPanel() {
  const { historyOpen } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!historyOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "closeHistory" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen, dispatch]);

  if (!historyOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={() => dispatch({ type: "closeHistory" })}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="relative flex h-full w-full flex-col bg-white shadow-xl md:w-1/2"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="history-title" className="text-lg font-bold text-slate-900">
            履歴
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => dispatch({ type: "closeHistory" })}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            閉じる
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-700">
          <p>生成に成功した結果を、新規・リライト合計で最新20件まで保存します。</p>
          <p className="mt-6 rounded-md bg-slate-50 px-3 py-6 text-center text-slate-500">
            まだ履歴はありません。
          </p>
        </div>
      </section>
    </div>
  );
}
