// 新規作成モードの作業データの形

export type Candidate = {
  id: string;
  keyword: string;
  /** 検索数。"" は未入力、"0" は0として区別する */
  volume: string;
  source: "" | "aramakijake" | "ubersuggest" | "other";
  /** 確認日（YYYY-MM-DD） */
  checkedOn: string;
};

export type KeywordInsight = {
  keyword: string;
  intent: string;
  relevance: string;
  angle: string;
  reason: string;
};

export type PlanField = "theme" | "persona" | "question" | "summary" | "strength";

/** 項目の出自。none=利用者の入力、ai=AI推定のまま、edited=AI推定を手動修正 */
export type Origin = "none" | "ai" | "edited";

export type Tone = "easy" | "business" | "friendly";

export type TopRef = {
  id: string;
  rank: string;
  title: string;
  url: string;
  /** 確認日時（YYYY-MM-DDTHH:mm） */
  checkedAt: string;
};

export type TrendCategory = {
  name: string;
  refIds: string[];
};

export type GeneratedTitle = {
  text: string;
  aim: string;
};

export type TitleResult = {
  items: GeneratedTitle[];
  generatedAt: string;
  /** 開発用のサンプル結果かどうか */
  isSample: boolean;
};

/** 補足質問（確認が必要な点） */
export type ClarifyIssue = {
  id: string;
  /** 不足・不一致の理由 */
  reason: string;
  question: string;
  /** 選択肢（あれば押すだけで回答欄に入る） */
  choices?: string[];
};

export type Clarification = {
  issues: ClarifyIssue[];
  answers: Record<string, string>;
};

/**
 * 各結果を作ったときの条件の「指紋」（条件を文字列にしたもの）。
 * 今の条件の指紋と違えば、結果は「変更前の条件」のものと判断する。
 */
export type NewBasis = {
  insights?: string;
  /** 企画を確認・提案したときの主キーワード */
  plan?: string;
  /** 上位タイトルを登録・確認したときの主キーワード */
  refsKeyword?: string;
  trend?: string;
  titles?: string;
};

export type NewDraft = {
  candidates: Candidate[];
  keywordInsights: KeywordInsight[] | null;
  plan: Record<PlanField, string>;
  planOrigin: Record<PlanField, Origin>;
  /** 手動入力済みの項目へのAI提案（採用前の差分確認用） */
  planPending: Partial<Record<PlanField, string>>;
  tone: Tone;
  topRefs: TopRef[];
  trend: TrendCategory[] | null;
  titles: TitleResult | null;
  basis: NewBasis;
  /** タイトル生成で返ってきた補足質問。null なら質問なし */
  clarify: Clarification | null;
};

export const PLAN_FIELDS: PlanField[] = ["theme", "persona", "question", "summary", "strength"];

export const TONE_LABEL: Record<Tone, string> = {
  easy: "わかりやすい",
  business: "ビジネス向け",
  friendly: "親しみやすい",
};

export const SOURCE_LABEL: Record<Candidate["source"], string> = {
  "": "未選択",
  aramakijake: "aramakijake.jp",
  ubersuggest: "Ubersuggest",
  other: "その他",
};

export const initialNewDraft: NewDraft = {
  candidates: [],
  keywordInsights: null,
  plan: { theme: "", persona: "", question: "", summary: "", strength: "" },
  planOrigin: { theme: "none", persona: "none", question: "none", summary: "none", strength: "none" },
  planPending: {},
  tone: "easy",
  topRefs: [],
  trend: null,
  titles: null,
  basis: {},
  clarify: null,
};

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowLocalString(): string {
  const d = new Date();
  return `${todayString()}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
