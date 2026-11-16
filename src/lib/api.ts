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
import type { Comparison, ImprovedTitle, RewriteDraft, RewritePlanField } from "@/state/rewriteDraft";
import { mockApi } from "@/mocks/mockApi";

export type PlanSuggestion = Partial<Record<PlanField, string>>;

export type FetchedArticle = {
  title: string;
  body: string;
  headings: string[];
};

export type ArticleAnalysis = {
  plan: Partial<Record<RewritePlanField, string>>;
  keywordCandidates: string[];
};

export type RewriteTitlesInput = {
  keywords: Keywords;
  currentTitle: string;
  body: string;
  plan: RewriteDraft["plan"];
  tone: RewriteDraft["tone"];
  referenceTitles: string[];
};

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

  // ---- タイトルリライト ----
  /** 記事URLの読み込み（AI処理ではないため利用回数に数えない） */
  fetchArticle(input: { url: string }): Promise<FetchedArticle>;
  analyzeArticle(input: {
    currentTitle: string;
    body: string;
    headings: string;
    keywords: Keywords;
  }): Promise<ArticleAnalysis>;
  compareTop(input: {
    currentTitle: string;
    mainKeyword: string;
    body: string;
    refs: { id: string; title: string }[];
  }): Promise<Comparison>;
  generateRewriteTitles(input: RewriteTitlesInput): Promise<ImprovedTitle[]>;
};

/** 今使っている実装がサンプルかどうか（画面に「サンプル」と表示するため） */
export const USING_SAMPLE_API = true;

export const api: TitleApi = mockApi;
