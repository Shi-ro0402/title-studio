"use client";

import { KeywordStep } from "@/components/new/KeywordStep";
import { PlanStep } from "@/components/new/PlanStep";
import { TitleStep } from "@/components/new/TitleStep";
import { TopStep } from "@/components/new/TopStep";
import { useCurrentMode } from "@/state/workspace";
import { StepPlaceholder } from "./StepPlaceholder";

/** 選択中のモード・工程の中身だけを表示する */
export function StepContent() {
  const { mode, step } = useCurrentMode();

  if (mode === "new") {
    switch (step.id) {
      case "keyword":
        return <KeywordStep />;
      case "plan":
        return <PlanStep />;
      case "top":
        return <TopStep />;
      case "titles":
        return <TitleStep />;
    }
  }
  // リライトは段階3で作成する
  return <StepPlaceholder />;
}
