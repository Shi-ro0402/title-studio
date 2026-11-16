"use client";

// 補助キーワードの一覧と手入力欄（新規・リライト共通）

import { useState } from "react";
import { Field, RequiredBadge, inputClass } from "@/components/ui/Field";
import { LIMITS } from "@/lib/limits";
import type { Mode } from "@/lib/steps";
import { useCurrentMode } from "@/state/workspace";
import { useKeywordOps } from "./useKeywordOps";

export function SubKeywordEditor({ mode }: { mode: Mode }) {
  const { locked } = useCurrentMode();
  const { keywords, addSub, removeSub } = useKeywordOps(mode);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const full = keywords.sub.length >= LIMITS.subKeywords;
  const inputId = `${mode}-sub-input`;

  const submit = () => {
    const message = addSub(input);
    setError(message);
    if (!message) setInput("");
  };

  return (
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
      <Field id={inputId} label="補助キーワードを手入力" required={false} max={LIMITS.keyword} value={input} error={error}>
        <div className="flex gap-2">
          <input
            id={inputId}
            className={inputClass}
            value={input}
            disabled={locked || full}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // 日本語の変換確定の Enter では追加しない
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            disabled={locked || full}
            onClick={submit}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </Field>
    </div>
  );
}
