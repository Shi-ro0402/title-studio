"use client";

import { useState, type ReactNode } from "react";
import { useCurrentMode, useWorkspaceDispatch } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";

type StepFooterProps = {
  /**
   * 「次へ」の前に、この工程の必須入力を確認する。問題がなければ true。
   * 任意項目の未入力では止めない。
   */
  onBeforeNext?: () => boolean;
  /** 戻る／次へ以外の副次操作（例：このキーワードでリライト） */
  extra?: ReactNode;
};

/** 「戻る」「次へ」。移動先がわかる文言にする */
export function StepFooter({ onBeforeNext, extra }: StepFooterProps) {
  const { mode, steps, stepIndex, locked } = useCurrentMode();
  const dispatch = useWorkspaceDispatch();
  const theme = MODE_THEME[mode];
  const [blocked, setBlocked] = useState(false);

  const prev = stepIndex > 0 ? steps[stepIndex - 1] : null;
  const current = steps[stepIndex];

  const next = () => {
    if (onBeforeNext && !onBeforeNext()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    dispatch({ type: "markStepDone", step: stepIndex });
    dispatch({ type: "goToStep", step: stepIndex + 1 });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4">
      {blocked && (
        <p role="alert" className="text-sm text-red-700">
          入力が必要な項目、または文字数を超えている項目があります。各欄の下の説明を確認してください。
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {prev && (
            <button
              type="button"
              onClick={() => dispatch({ type: "goToStep", step: stepIndex - 1 })}
              disabled={locked}
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              ← {prev.label}へ戻る
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {extra}
          {current.nextLabel && (
            <button
              type="button"
              onClick={next}
              disabled={locked}
              className={`w-full rounded-md px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${theme.primaryButton}`}
            >
              {current.nextLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
