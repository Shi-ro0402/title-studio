"use client";

import { MODE_LABEL, stepNumber } from "@/lib/steps";
import { useCurrentMode } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";

/** 工程の中身ができるまでの仮表示。工程の目的と未実施の状態を示す */
export function StepPlaceholder() {
  const { mode, step, stepIndex } = useCurrentMode();
  const theme = MODE_THEME[mode];

  return (
    <section aria-labelledby="step-title" className="flex flex-col gap-3">
      <p className={`text-xs font-bold ${theme.accentText}`}>
        {MODE_LABEL[mode]}
      </p>
      <h1 id="step-title" className="text-xl font-bold text-slate-900">
        {stepNumber(stepIndex)} {step.title}
      </h1>
      <p className="text-sm text-slate-700">{step.purpose}</p>
      <div
        className={`rounded-md border border-dashed ${theme.accentBorder} bg-slate-50 px-4 py-8 text-center text-sm text-slate-500`}
      >
        この工程の入力欄は、次の段階で作成します。
      </div>
    </section>
  );
}
