// 開発用のサンプルAPI。AIは使わず、少し待ってから固定のサンプルを返す。
// 画面と操作を先に作るためのもので、段階6で Claude API に差し替える。

import type { TitleApi } from "@/lib/api";
import { SAMPLE_TITLES } from "./sampleData";

const WAIT_MS = 1200;

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, WAIT_MS));
}

const INTENTS = [
  "情報収集（基本や全体像を知りたい）",
  "比較・検討（選び方や違いを知りたい）",
  "行動（始め方・手順を知りたい）",
];

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
    // 根拠が少ないときは無理にカテゴリを増やさない（最大3個、件数以下）
    const names = ["基礎知識", "始め方・手順", "注意点"];
    const count = Math.min(names.length, refs.length);
    return names.slice(0, count).map((name, i) => ({
      name,
      refIds: refs.filter((_, j) => j % count === i).map((r) => r.id),
    }));
  },

  async generateTitles() {
    await wait();
    return SAMPLE_TITLES.map((t) => ({ ...t }));
  },
};
