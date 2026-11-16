"use client";

import { KeywordStep } from "@/components/new/KeywordStep";
import { PlanStep } from "@/components/new/PlanStep";
import { TitleStep } from "@/components/new/TitleStep";
import { TopStep } from "@/components/new/TopStep";
import { CompareStep } from "@/components/rewrite/CompareStep";
import { ConditionStep } from "@/components/rewrite/ConditionStep";
import { ImproveStep } from "@/components/rewrite/ImproveStep";
import { KeywordRankStep } from "@/components/rewrite/KeywordRankStep";
import { LoadStep } from "@/components/rewrite/LoadStep";
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
  } else {
    switch (step.id) {
      case "load":
        return <LoadStep />;
      case "keyword":
        return <KeywordRankStep />;
      case "condition":
        return <ConditionStep />;
      case "compare":
        return <CompareStep />;
      case "improve":
        return <ImproveStep />;
    }
  }
  return <StepPlaceholder />;
}
