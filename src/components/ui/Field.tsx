"use client";

// 入力欄の共通部品。画面設計：項目名・必須／任意・入力欄・文字数・エラーの順に並べる。

import type { ReactNode } from "react";
import { countChars } from "@/lib/text";

export function RequiredBadge({ required }: { required: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
        required ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
      }`}
    >
      {required ? "必須" : "任意"}
    </span>
  );
}

type FieldProps = {
  id: string;
  label: string;
  required: boolean;
  /** 文字数の上限。指定すると「現在／上限」を表示する */
  max?: number;
  value?: string;
  error?: string | null;
  hint?: ReactNode;
  /** 項目名の右に出す追加表示（AI推定など） */
  badge?: ReactNode;
  children: ReactNode;
};

export function Field({ id, label, required, max, value, error, hint, badge, children }: FieldProps) {
  const count = value !== undefined ? countChars(value) : 0;
  const over = max !== undefined && count > max;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-bold text-slate-800">
          {label}
        </label>
        <RequiredBadge required={required} />
        {badge}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
      {max !== undefined && (
        <p className={`text-right text-xs ${over ? "font-bold text-red-700" : "text-slate-500"}`}>
          {count}／{max}文字
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 aria-[invalid=true]:border-red-500";
