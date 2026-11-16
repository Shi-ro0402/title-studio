"use client";

import { useState } from "react";
import { STEP_STATUS_LABEL, stepNumber, type StepStatus } from "@/lib/steps";
import { useCurrentMode, useRecheckSteps, useWorkspaceDispatch } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";

export function StepNav() {
  const { mode, steps, stepIndex, stepStatus, locked } = useCurrentMode();
  const recheck = useRecheckSteps();
  const dispatch = useWorkspaceDispatch();
  const theme = MODE_THEME[mode];
  const [mobileOpen, setMobileOpen] = useState(false);

  // 「再確認が必要」は、現在の工程でも優先して表示する
  const statusOf = (i: number): StepStatus =>
    recheck[i] ? "recheck" : i === stepIndex ? "current" : stepStatus[i];

  const go = (i: number) => {
    dispatch({ type: "goToStep", step: i });
    setMobileOpen(false);
  };

  const list = (
    <ol className="flex flex-col gap-2 md:flex-row">
      {steps.map((s, i) => {
        const status = statusOf(i);
        const active = i === stepIndex;
        return (
          <li key={s.id} className="md:flex-1">
            <button
              type="button"
              onClick={() => go(i)}
              disabled={locked}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-md border-2 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? theme.stepActive
                  : "border-transparent bg-white/70 text-slate-600 hover:bg-white"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active ? theme.stepBadge : "bg-slate-200 text-slate-600"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">{s.label}</span>
                <span
                  className={`text-xs ${
                    status === "recheck" ? "font-bold text-amber-700" : "text-slate-500"
                  }`}
                >
                  {STEP_STATUS_LABEL[status]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav aria-label="工程">
      {/* PC：工程名を一覧表示 */}
      <div className="hidden md:block">{list}</div>

      {/* スマートフォン：現在位置と、工程一覧を開く操作 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2">
          <p className="text-sm font-bold text-slate-800">
            {stepNumber(stepIndex)} {steps[stepIndex].label}
            <span className="font-normal text-slate-500">／全{steps.length}工程</span>
            {recheck.some(Boolean) && (
              <span className="ml-2 text-xs font-bold text-amber-700">再確認が必要な工程あり</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            disabled={locked}
            aria-expanded={mobileOpen}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mobileOpen ? "閉じる" : "工程一覧"}
          </button>
        </div>
        {mobileOpen && <div className="mt-2">{list}</div>}
      </div>
    </nav>
  );
}
