// AI処理の API（POST /api/ai、送信内容は { action: 処理名, input: 入力 }）
// ・合言葉を通過したブラウザだけが使える
// ・1回の操作（内部の自動修正を含む）で利用回数を1回使う。直近20分で10回まで
// ・AIの回答を得られなかった場合（設定・通信・混雑など、こちらやAI側の事情）は、使った1回を戻す
// ・APIキーはサーバー側だけで使う

import {
  analyzeArticle,
  analyzeKeywords,
  analyzeTop,
  compareTop,
  generateRewriteTitles,
  generateTitles,
  suggestPlan,
} from "@/lib/server/aiActions";
import { AiError, type AiErrorCode } from "@/lib/server/claude";
import { formatWait, jsonError, requireSession } from "@/lib/server/guard";
import { consumeUsage, refundUsage, type Usage } from "@/lib/server/limits";
import { StoreNotConfiguredError } from "@/lib/server/store";

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

// AIが実際に処理した（料金がかかった）可能性があるものは戻さない
const NO_REFUND: AiErrorCode[] = ["timeout", "format", "refusal"];

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, "invalid_input", "送信された内容が大きすぎます。");
  let action: unknown;
  let input: unknown;
  try {
    ({ action, input } = JSON.parse(raw));
  } catch {
    return jsonError(400, "invalid_input", "リクエストの形式が正しくありません。");
  }
  const handler = typeof action === "string" && Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
  if (!handler) return jsonError(404, "not_found", "指定された処理はありません。");

  // 利用回数を1回使う（上限なら止める）
  let consumed: { ok: boolean; usage: Usage; stamp: number };
  try {
    consumed = await consumeUsage(session.browserId);
  } catch (e) {
    if (e instanceof StoreNotConfiguredError) {
      return jsonError(503, "store_not_configured", "利用回数を記録する保存先が設定されていないため、AI処理を止めています。");
    }
    throw e;
  }
  if (!consumed.ok) {
    return jsonError(
      429,
      "usage_limit",
      `直近${consumed.usage.windowMinutes}分間の利用上限（${consumed.usage.limit}回）に達しました。あと約${formatWait(consumed.usage.retryAfterSec)}で再開できます。閲覧・コピー・工程の移動は続けられます。`,
      { usage: consumed.usage },
    );
  }

  try {
    const result = await handler(input);
    return Response.json({ ok: true, result, usage: consumed.usage });
  } catch (e) {
    const err = e instanceof AiError ? e : null;
    if (!err) console.error(`[ai/${String(action)}] unexpected error`, e);
    const usage =
      err && NO_REFUND.includes(err.code) ? consumed.usage : await refundUsage(session.browserId, consumed.stamp);
    if (err) {
      const status =
        err.code === "invalid_input" ? 400
        : err.code === "no_key" || err.code === "auth" ? 503
        : err.code === "rate_limited" ? 429
        : err.code === "timeout" ? 504
        : 502;
      return jsonError(status, err.code, err.message, { usage });
    }
    return jsonError(500, "unknown", "AIの処理でエラーが起きました。時間をおいて再試行してください。", { usage });
  }
}
