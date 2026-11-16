// AI処理の API（POST /api/ai、送信内容は { action: 処理名, input: 入力 }）
// APIキーはサーバー側だけで使う。利用回数の制限は段階8で追加する。

import {
  analyzeArticle,
  analyzeKeywords,
  analyzeTop,
  compareTop,
  generateRewriteTitles,
  generateTitles,
  suggestPlan,
} from "@/lib/server/aiActions";
import { AiError } from "@/lib/server/claude";

const ACTIONS: Record<string, (input: unknown) => Promise<unknown>> = {
  "analyze-keywords": analyzeKeywords,
  "suggest-plan": suggestPlan,
  "analyze-top": analyzeTop,
  "generate-titles": generateTitles,
  "analyze-article": analyzeArticle,
  "compare-top": compareTop,
  "generate-rewrite-titles": generateRewriteTitles,
};

// 入力の上限（本文5,000文字＋その他の項目に十分な大きさ）
const MAX_BODY_BYTES = 100_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return error(413, "invalid_input", "送信された内容が大きすぎます。");
  let action: unknown;
  let input: unknown;
  try {
    ({ action, input } = JSON.parse(raw));
  } catch {
    return error(400, "invalid_input", "リクエストの形式が正しくありません。");
  }
  const handler = typeof action === "string" && Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
  if (!handler) return error(404, "not_found", "指定された処理はありません。");

  try {
    const result = await handler(input);
    return Response.json({ ok: true, result });
  } catch (e) {
    if (e instanceof AiError) {
      const status =
        e.code === "invalid_input" ? 400
        : e.code === "no_key" || e.code === "auth" ? 503
        : e.code === "rate_limited" ? 429
        : e.code === "timeout" ? 504
        : 502;
      return error(status, e.code, e.message);
    }
    console.error(`[ai/${action}] unexpected error`, e);
    return error(500, "unknown", "AIの処理でエラーが起きました。時間をおいて再試行してください。");
  }
}

function error(status: number, code: string, message: string) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}
