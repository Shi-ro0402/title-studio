// 条件変更後の再確認（画面設計「変更後の再確認」）
// 結果を作ったときの条件を「指紋」（条件を並べた文字列）として記録し、
// 今の条件の指紋と比べて違えば「変更前の条件の結果」と判断する。
// 変更しただけでAI処理を自動実行はしない。入力と以前の結果は残し、再確認先を表示する。

import type { Keywords } from "@/state/workspace";
import type { NewDraft, TopRef } from "@/state/newDraft";
import type { RewriteDraft } from "@/state/rewriteDraft";

const fp = (value: unknown) => JSON.stringify(value);
const refsFp = (refs: TopRef[]) => refs.map((r) => [r.rank.trim(), r.title.trim()]);

// ---- 新規作成 ----

export const newFingerprint = {
  insights: (d: NewDraft) => fp(d.candidates.map((c) => c.keyword.trim()).filter(Boolean)),
  keyword: (k: Keywords) => k.main ?? "",
  trend: (d: NewDraft, k: Keywords) => fp({ main: k.main, refs: refsFp(d.topRefs) }),
  titles: (d: NewDraft, k: Keywords) => fp({ k, plan: d.plan, tone: d.tone, refs: refsFp(d.topRefs) }),
};

export type NewRecheck = {
  insights: boolean;
  plan: boolean;
  refs: boolean;
  trend: boolean;
  titles: boolean;
  /** 工程ごとに「再確認が必要」か */
  steps: boolean[];
};

export function newRecheck(d: NewDraft, k: Keywords): NewRecheck {
  const b = d.basis;
  const insights = d.keywordInsights !== null && b.insights !== newFingerprint.insights(d);
  const plan = b.plan !== undefined && b.plan !== newFingerprint.keyword(k);
  const refs = d.topRefs.length > 0 && b.refsKeyword !== undefined && b.refsKeyword !== newFingerprint.keyword(k);
  const trend = d.trend !== null && b.trend !== newFingerprint.trend(d, k);
  const titles = d.titles !== null && b.titles !== newFingerprint.titles(d, k);
  return { insights, plan, refs, trend, titles, steps: [insights, plan, refs || trend, titles] };
}

// ---- タイトルリライト ----

export const rewriteFingerprint = {
  analysis: (d: RewriteDraft) => fp({ t: d.currentTitle, b: d.body, h: d.headings }),
  rank: (d: RewriteDraft, k: Keywords) => fp({ url: d.loaded?.url ?? d.url.trim(), main: k.main }),
  condition: (d: RewriteDraft, k: Keywords) => fp({ main: k.main, body: d.body }),
  keyword: (k: Keywords) => k.main ?? "",
  comparison: (d: RewriteDraft, k: Keywords) =>
    fp({ main: k.main, title: d.currentTitle, body: d.body, refs: refsFp(d.topRefs) }),
  titles: (d: RewriteDraft, k: Keywords) =>
    fp({ k, title: d.currentTitle, body: d.body, plan: d.plan, tone: d.tone, refs: refsFp(d.topRefs) }),
};

export type RewriteRecheck = {
  /** URL欄が、読み込んだときのURLから変わっている */
  url: boolean;
  analysis: boolean;
  rank: boolean;
  condition: boolean;
  refs: boolean;
  comparison: boolean;
  titles: boolean;
  steps: boolean[];
};

export function rewriteRecheck(d: RewriteDraft, k: Keywords): RewriteRecheck {
  const b = d.basis;
  const url = d.loaded !== null && d.url.trim() !== d.loaded.url;
  const analysis = d.keywordCandidates !== null && b.analysis !== rewriteFingerprint.analysis(d);
  const rank = d.rank.status !== "unchecked" && b.rank !== undefined && b.rank !== rewriteFingerprint.rank(d, k);
  const condition = b.condition !== undefined && b.condition !== rewriteFingerprint.condition(d, k);
  const refs = d.topRefs.length > 0 && b.refsKeyword !== undefined && b.refsKeyword !== rewriteFingerprint.keyword(k);
  const comparison = d.comparison !== null && b.comparison !== rewriteFingerprint.comparison(d, k);
  const titles = d.titles !== null && b.titles !== rewriteFingerprint.titles(d, k);
  return {
    url,
    analysis,
    rank,
    condition,
    refs,
    comparison,
    titles,
    steps: [url || analysis, rank, condition, refs || comparison, titles],
  };
}
