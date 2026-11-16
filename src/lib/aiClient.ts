// 画面から AI処理の API（/api/ai）を呼ぶ。中身は src/lib/server/aiActions.ts

import type { TitleApi } from "./api";
import { postJson } from "./postJson";

// サーバー側は1操作60秒で打ち切る。往復分の余裕を見て、画面側は70秒で諦める
const CLIENT_TIMEOUT_MS = 70_000;

async function call<T>(action: string, input: unknown): Promise<T> {
  const data = await postJson<{ result: T }>("/api/ai", { action, input }, CLIENT_TIMEOUT_MS);
  return data.result;
}

export const aiClient: Omit<TitleApi, "fetchArticle"> = {
  analyzeKeywords: (input) => call("analyze-keywords", input),
  suggestPlan: (input) => call("suggest-plan", input),
  analyzeTop: (input) => call("analyze-top", input),
  generateTitles: (input) => call("generate-titles", input),
  analyzeArticle: (input) => call("analyze-article", input),
  compareTop: (input) => call("compare-top", input),
  generateRewriteTitles: (input) => call("generate-rewrite-titles", input),
};
