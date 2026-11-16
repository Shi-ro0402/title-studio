// タイトルリライトモードの作業データの形

import type { HistoryEntry, SaveStatus } from "@/lib/history";

import {
  todayString,
  type Candidate,
  type Clarification,
  type Origin,
  type Tone,
  type TopRef,
  type TrendCategory,
} from "./newDraft";

export type RewritePlanField =
  | "theme"
  | "persona"
  | "question"
  | "summary"
  | "strength"
  | "improvement";

export type RankStatus = "unchecked" | "ranked" | "out" | "notfound";

export const RANK_STATUS_LABEL: Record<RankStatus, string> = {
  unchecked: "未確認",
  ranked: "順位あり",
  out: "圏外",
  notfound: "未発見",
};

export type RankRecord = {
  status: RankStatus;
  /** 順位（status が ranked のときだけ使う） */
  rank: string;
  checkedAt: string;
  country: string;
  language: string;
  region: string;
  device: "" | "pc" | "mobile";
  source: string;
  /** 圏外・未発見のときに確認した範囲（例：上位100位まで） */
  range: string;
};

export type ImprovedTitle = {
  text: string;
  aim: string;
  improvement: string;
  evidence: string;
};

export type Comparison = {
  trend: TrendCategory[];
  common: string[];
  differences: string[];
  answerable: string[];
};

/** URLから読み込んだ直後の内容。編集済みかどうかの判定に使う */
export type LoadedSnapshot = {
  /** 読み込んだURL */
  url: string;
  title: string;
  body: string;
  headings: string;
  /** 本文中の画像の枚数（内容は確認していない） */
  imageCount: number;
};

/** 各結果を作ったときの条件の指紋（newDraft.ts の NewBasis と同じ考え方） */
export type RewriteBasis = {
  analysis?: string;
  rank?: string;
  condition?: string;
  refsKeyword?: string;
  comparison?: string;
  titles?: string;
};

export type RewriteDraft = {
  url: string;
  /** 本文の用意のしかた */
  inputMethod: "url" | "paste";
  loaded: LoadedSnapshot | null;
  currentTitle: string;
  body: string;
  /** 抽出見出し（1行に1つ） */
  headings: string;
  /** 「記事を分析する」で推定したキーワード候補。選択済みキーワードは自動で上書きしない */
  keywordCandidates: string[] | null;
  demand: Pick<Candidate, "volume" | "source" | "checkedOn">;
  rank: RankRecord;
  plan: Record<RewritePlanField, string>;
  planOrigin: Record<RewritePlanField, Origin>;
  planPending: Partial<Record<RewritePlanField, string>>;
  tone: Tone;
  topRefs: TopRef[];
  comparison: Comparison | null;
  titles: {
    items: ImprovedTitle[];
    generatedAt: string;
    isSample: boolean;
    entry: HistoryEntry;
    saveStatus: SaveStatus;
  } | null;
  basis: RewriteBasis;
  clarify: Clarification | null;
};

const emptyPlan: Record<RewritePlanField, string> = {
  theme: "",
  persona: "",
  question: "",
  summary: "",
  strength: "",
  improvement: "",
};

const noneOrigin: Record<RewritePlanField, Origin> = {
  theme: "none",
  persona: "none",
  question: "none",
  summary: "none",
  strength: "none",
  improvement: "none",
};

export const initialRewriteDraft: RewriteDraft = {
  url: "",
  inputMethod: "url",
  loaded: null,
  currentTitle: "",
  body: "",
  headings: "",
  keywordCandidates: null,
  demand: { volume: "", source: "", checkedOn: todayString() },
  rank: {
    status: "unchecked",
    rank: "",
    checkedAt: "",
    country: "日本",
    language: "日本語",
    region: "",
    device: "",
    source: "Google（手動確認）",
    range: "",
  },
  plan: emptyPlan,
  planOrigin: noneOrigin,
  planPending: {},
  tone: "easy",
  topRefs: [],
  comparison: null,
  titles: null,
  basis: {},
  clarify: null,
};

/** URLから読み込んだあとに、タイトル・本文・見出しを手で直したか */
export function isEditedAfterLoad(d: RewriteDraft): boolean {
  if (!d.loaded) return d.currentTitle !== "" || d.body !== "" || d.headings !== "";
  return (
    d.loaded.title !== d.currentTitle ||
    d.loaded.body !== d.body ||
    d.loaded.headings !== d.headings
  );
}
