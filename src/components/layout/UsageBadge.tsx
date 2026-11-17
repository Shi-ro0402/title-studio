"use client";

// ヘッダーの「AI利用 残り n／10回」。サーバーの記録にもとづく値だけを表示する。
// 上限に達しているときは、再開までの時間を表示し、その時刻になったら取り直す。

import { useEffect } from "react";
import { refreshUsage, useUsage } from "@/lib/usage";

export function UsageBadge() {
  const { usage } = useUsage();

  useEffect(() => {
    refreshUsage();
  }, []);

  // 上限に達しているときは、再開できる時刻に取り直す
  useEffect(() => {
    if (!usage || usage.remaining > 0) return;
    const timer = setTimeout(refreshUsage, (usage.retryAfterSec + 1) * 1000);
    return () => clearTimeout(timer);
  }, [usage]);

  if (!usage) {
    return <span className="text-xs text-slate-500">AI利用：確認中…</span>;
  }
  if (usage.remaining === 0) {
    return (
      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-800">
        AI利用：上限（あと約{Math.ceil(usage.retryAfterSec / 60)}分で再開）
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-600" title={`直近${usage.windowMinutes}分間に${usage.limit}回まで使えます`}>
      AI利用：残り<span className="mx-0.5 font-bold text-slate-900">{usage.remaining}</span>／{usage.limit}回
      <span className="hidden sm:inline">（{usage.windowMinutes}分ごと）</span>
    </span>
  );
}
