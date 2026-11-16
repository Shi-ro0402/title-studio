"use client";

import { useHistory } from "@/lib/history";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

export function Header() {
  const { processing } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  // 実際に保存されている件数（最大20件）
  const historyCount = useHistory().length;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-lg font-bold text-slate-900">Title Studio</p>
          <p className="text-xs text-slate-500">AI記事タイトル候補ジェネレーター</p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "openHistory" })}
          disabled={processing !== null}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          履歴 {historyCount}件
        </button>
      </div>
    </header>
  );
}
