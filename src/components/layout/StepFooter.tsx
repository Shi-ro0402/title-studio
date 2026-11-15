"use client";

import { useCurrentMode, useWorkspaceDispatch } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";

/** 「戻る」「次へ」。移動先がわかる文言にする */
export function StepFooter() {
  const { mode, steps, stepIndex, locked } = useCurrentMode();
  const dispatch = useWorkspaceDispatch();
  const theme = MODE_THEME[mode];

  const prev = stepIndex > 0 ? steps[stepIndex - 1] : null;
  const current = steps[stepIndex];

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
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
      <div>
        {current.nextLabel && (
          <button
            type="button"
            onClick={() => dispatch({ type: "goToStep", step: stepIndex + 1 })}
            disabled={locked}
            className={`w-full rounded-md px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${theme.primaryButton}`}
          >
            {current.nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
