"use client";

import { MODE_LABEL, stepNumber } from "@/lib/steps";
import { useCurrentMode } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";
import { StepFooter } from "./StepFooter";

/** 工程の見出し（モード名・工程番号・目的） */
export function StepHeading() {
  const { mode, step, stepIndex } = useCurrentMode();
  const theme = MODE_THEME[mode];
  return (
    <div className="flex flex-col gap-1">
      <p className={`text-xs font-bold ${theme.accentText}`}>{MODE_LABEL[mode]}</p>
      <h1 id="step-title" className="text-xl font-bold text-slate-900">
        {stepNumber(stepIndex)} {step.title}
      </h1>
      <p className="text-sm text-slate-700">{step.purpose}</p>
    </div>
  );
}

/** 工程の中身ができるまでの仮表示 */
export function StepPlaceholder() {
  const { mode } = useCurrentMode();
  const theme = MODE_THEME[mode];

  return (
    <>
      <section aria-labelledby="step-title" className="flex flex-col gap-3">
        <StepHeading />
        <div
          className={`rounded-md border border-dashed ${theme.accentBorder} bg-slate-50 px-4 py-8 text-center text-sm text-slate-500`}
        >
          この工程の入力欄は、次の段階で作成します。
        </div>
      </section>
      <StepFooter />
    </>
  );
}
