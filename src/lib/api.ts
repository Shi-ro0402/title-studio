// 画面からAI処理を呼び出す窓口。
// 今はサンプルデータを返す mockApi を使っている。段階6で Claude API を呼ぶ実装に差し替える。

import type { Keywords } from "@/state/workspace";
import type {
  GeneratedTitle,
  KeywordInsight,
  NewDraft,
  PlanField,
  TrendCategory,
} from "@/state/newDraft";
import { mockApi } from "@/mocks/mockApi";

export type PlanSuggestion = Partial<Record<PlanField, string>>;

export type GenerateTitlesInput = {
  keywords: Keywords;
  plan: NewDraft["plan"];
  tone: NewDraft["tone"];
  referenceTitles: string[];
};

export type TitleApi = {
  analyzeKeywords(input: { keywords: string[] }): Promise<KeywordInsight[]>;
  suggestPlan(input: { keywords: Keywords }): Promise<PlanSuggestion>;
  analyzeTop(input: {
    mainKeyword: string;
    refs: { id: string; title: string }[];
  }): Promise<TrendCategory[]>;
  generateTitles(input: GenerateTitlesInput): Promise<GeneratedTitle[]>;
};

/** 今使っている実装がサンプルかどうか（画面に「サンプル」と表示するため） */
export const USING_SAMPLE_API = true;

export const api: TitleApi = mockApi;
