// 開発用のサンプルAPI。AIは使わず、少し待ってから固定のサンプルを返す。
// 画面と操作を先に作るためのもので、段階5（URL読み込み）・段階6（Claude API）で差し替える。

import type { TitleApi } from "@/lib/api";
import { SAMPLE_ARTICLE, SAMPLE_IMPROVED_TITLES, SAMPLE_TITLES } from "./sampleData";

const WAIT_MS = 1200;

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, WAIT_MS));
}

const INTENTS = [
  "情報収集（基本や全体像を知りたい）",
  "比較・検討（選び方や違いを知りたい）",
  "行動（始め方・手順を知りたい）",
];

function sampleTrend(refs: { id: string }[]) {
  // 根拠が少ないときは無理にカテゴリを増やさない（最大3個、件数以下）
  const names = ["基礎知識", "始め方・手順", "注意点"];
  const count = Math.min(names.length, refs.length);
  return names.slice(0, count).map((name, i) => ({
    name,
    refIds: refs.filter((_, j) => j % count === i).map((r) => r.id),
  }));
}

export const mockApi: TitleApi = {
  async analyzeKeywords({ keywords }) {
    await wait();
    return keywords.map((keyword, i) => ({
      keyword,
      intent: INTENTS[i % INTENTS.length],
      relevance: i === 0 ? "記事の目的と強く関連" : "記事の一部で扱える",
      angle: `「${keyword}」で検索する人が最初に知りたいことから説明する`,
      reason: "サンプル：検索語の言い回しから、知りたい内容を推定した例です。",
    }));
  },

  async suggestPlan({ keywords }) {
    await wait();
    const main = keywords.main ?? "このキーワード";
    return {
      theme: `${main}の基本と、初めて取り組むときの進め方`,
      persona: `${main}に興味があるが、何から始めればよいかわからない初心者。調べる時間は限られており、全体像と最初の一歩を知りたい。`,
      question: `${main}とは何か、始めるには何が必要か、つまずきやすい点はどこか。`,
      strength: "",
    };
  },

  async analyzeTop({ refs }) {
    await wait();
    return sampleTrend(refs);
  },

  async generateTitles() {
    await wait();
    return SAMPLE_TITLES.map((t) => ({ ...t }));
  },

  async fetchArticle() {
    await wait();
    return { ...SAMPLE_ARTICLE, headings: [...SAMPLE_ARTICLE.headings] };
  },

  async analyzeArticle() {
    await wait();
    return {
      plan: {
        theme: "未経験からWebライターを始めるための準備と最初の行動",
        persona: "副業でWebライターを始めたい会社員。文章を書くのは好きだが実績がなく、何から準備すればよいかわからない。",
        question: "未経験でもWebライターになれるのか、最初に何をすればよいのか。",
        summary: "Webライターの仕事内容、始める前の準備（学習・ポートフォリオ）、案件の探し方と応募時の注意点を順に説明している。",
        strength: "",
      },
      keywordCandidates: ["webライター 未経験", "webライター 始め方", "webライター 案件"],
    };
  },

  async compareTop({ refs }) {
    await wait();
    return {
      trend: sampleTrend(refs),
      common: ["「未経験」「始め方」を前半に置き、初心者向けであることを示している"],
      differences: ["上位は手順の網羅を打ち出すものが多く、現在のタイトルは準備の話に寄っている"],
      answerable: ["始める前の準備", "案件の探し方", "応募時の注意点"],
    };
  },

  async generateRewriteTitles() {
    await wait();
    return SAMPLE_IMPROVED_TITLES.map((t) => ({ ...t }));
  },
};
