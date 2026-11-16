"use client";

// 「変更前の条件の結果です」などの再確認の案内。色だけに頼らず文字で示す。

import { useCurrentMode } from "@/state/workspace";

type Action = { label: string; onClick: () => void };

export function StaleNotice({ title, message, actions = [] }: { title: string; message?: string; actions?: Action[] }) {
  const { locked } = useCurrentMode();
  return (
    <div role="status" className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="font-bold">⚠ {title}</p>
      {message && <p className="text-xs">{message}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} disabled={locked}
              className="rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
