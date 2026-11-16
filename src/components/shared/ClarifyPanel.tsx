"use client";

// 「確認が必要な点」。不足・不一致の理由と質問を表示し、回答を受け付ける。
// 入力済みの他の情報は保持したまま、「補足を反映して再確認・生成」で続行する。
// 質問を読む・回答するだけではAIを呼ばない。再実行はAI利用1回。

import type { Supplement } from "@/lib/api";
import { LIMITS } from "@/lib/limits";
import { countChars, isBlank } from "@/lib/text";
import type { Clarification } from "@/state/newDraft";
import { useCurrentMode } from "@/state/workspace";
import { AiButton } from "@/components/ui/AiButton";
import { Field, inputClass } from "@/components/ui/Field";

type ClarifyPanelProps = {
  clarify: Clarification;
  running: boolean;
  onAnswer: (id: string, value: string) => void;
  onSubmit: () => void;
};

export function ClarifyPanel({ clarify, running, onAnswer, onSubmit }: ClarifyPanelProps) {
  const { locked } = useCurrentMode();
  const ready = clarifyReady(clarify);

  return (
    <div className="flex flex-col gap-4 rounded-md border-2 border-amber-300 bg-amber-50 p-4">
      <div>
        <h2 className="text-base font-bold text-amber-950">確認が必要な点</h2>
        <p className="text-xs text-amber-900">
          条件が足りないため、無理に10案を作らず確認しています。入力済みの他の情報はそのまま残っています。
        </p>
      </div>
      {clarify.issues.map((issue, i) => {
        const value = clarify.answers[issue.id] ?? "";
        const over = countChars(value) > LIMITS.supplement;
        const id = `clarify-${issue.id}`;
        return (
          <div key={issue.id} className="flex flex-col gap-2 rounded-md bg-white p-3">
            <p className="text-sm text-slate-700">
              <span className="font-bold">理由{clarify.issues.length > 1 ? ` ${i + 1}` : ""}：</span>
              {issue.reason}
            </p>
            {issue.choices && (
              <div className="flex flex-wrap gap-2">
                {issue.choices.map((choice) => (
                  <button key={choice} type="button" disabled={locked} onClick={() => onAnswer(issue.id, choice)}
                    aria-pressed={value === choice}
                    className={`rounded-full border px-3 py-1 text-xs ${value === choice ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"} disabled:opacity-50`}>
                    {choice}
                  </button>
                ))}
              </div>
            )}
            <Field id={id} label={issue.question} required max={LIMITS.supplement} value={value}
              error={over ? `${LIMITS.supplement}文字以内で入力してください。` : undefined}>
              <textarea id={id} rows={3} className={inputClass} value={value} disabled={locked}
                onChange={(e) => onAnswer(issue.id, e.target.value)} />
            </Field>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <AiButton label="補足を反映して再確認・生成" busyLabel="再確認中…" running={running} disabled={!ready} onClick={onSubmit} />
        {!ready && <p className="text-xs text-amber-900">すべての質問に回答すると実行できます。</p>}
      </div>
    </div>
  );
}

export function clarifyReady(clarify: Clarification): boolean {
  return clarify.issues.every((issue) => {
    const value = clarify.answers[issue.id] ?? "";
    return !isBlank(value) && countChars(value) <= LIMITS.supplement;
  });
}

export function toSupplements(clarify: Clarification | null): Supplement[] {
  if (!clarify) return [];
  return clarify.issues.map((issue) => ({ question: issue.question, answer: (clarify.answers[issue.id] ?? "").trim() }));
}
