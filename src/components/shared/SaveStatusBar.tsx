"use client";

// 生成結果欄に、今回の結果が履歴に保存されたかを表示する。
// 保存に失敗したときは結果の閲覧・コピーを続けられるようにし、「保存を再試行」を用意する。
// 再試行はAIを呼ばず、保持中の同じ結果を保存し直すだけ（利用回数は減らない・重複しない）。

import { saveHistoryEntry, type HistoryEntry, type SaveStatus } from "@/lib/history";

type SaveStatusBarProps = {
  status: SaveStatus;
  onRetry: () => void;
};

export function SaveStatusBar({ status, onRetry }: SaveStatusBarProps) {
  if (status === "saved") {
    return (
      <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
        ✓ 履歴に保存しました（ヘッダーの「履歴」から、あとで確認・コピーできます）
      </p>
    );
  }
  if (status === "skipped") {
    return (
      <p role="status" className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
        件数・文字数・重複の確認を通らなかったため、この結果は履歴に保存していません。必要に応じて生成し直してください。
      </p>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
      <span className="font-bold">履歴に保存できませんでした。このままページを閉じると今回の結果は失われます。</span>
      <button type="button" onClick={onRetry}
        className="rounded-md border border-red-400 bg-white px-3 py-1 text-xs font-medium text-red-900 hover:bg-red-100">
        保存を再試行
      </button>
    </div>
  );
}

/** 生成直後の自動保存。確認を通らなかった結果は保存しない */
export function autoSave(entry: HistoryEntry, valid: boolean): SaveStatus {
  if (!valid) return "skipped";
  return saveHistoryEntry(entry) ? "saved" : "failed";
}
