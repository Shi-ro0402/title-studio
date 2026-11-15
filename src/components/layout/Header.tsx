"use client";

import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

export function Header() {
  const { processing } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  // 履歴の保存は段階7で実装する。それまでは実際の保存件数として 0 を表示する
  const historyCount = 0;

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
