"use client";

import { useCurrentMode } from "@/state/workspace";

/** 主・補助キーワードの要約。対象を見失わないよう全工程で共通表示する */
export function KeywordSummary() {
  const { keywords } = useCurrentMode();

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-white px-3 py-2 text-sm">
      <div className="flex gap-2">
        <dt className="font-bold text-slate-600">主キーワード</dt>
        <dd className="text-slate-900">{keywords.main ?? "未設定"}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="font-bold text-slate-600">補助キーワード</dt>
        <dd className="text-slate-900">{keywords.sub.length > 0 ? keywords.sub.join("、") : "なし"}</dd>
      </div>
    </dl>
  );
}
