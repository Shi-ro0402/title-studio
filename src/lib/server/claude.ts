// Claude API を呼ぶ共通処理（サーバー専用）
// ・APIキーは環境変数 ANTHROPIC_API_KEY から読む（ブラウザには送らない）
// ・回答は JSON Schema で形を指定して受け取る
// ・1つの操作（自動修正を含む）は最大60秒で打ち切る
// ・AIが安全上の理由で回答を控えた場合は、サーバー側で別モデルに切り替える（fallbacks: "default"）

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";
export const AI_TIMEOUT_MS = 60_000;

export type AiErrorCode =
  | "no_key"
  | "auth"
  | "rate_limited"
  | "overloaded"
  | "timeout"
  | "refusal"
  | "format"
  | "invalid_input"
  | "network"
  | "unknown";

/** 利用者に見せてよい理由つきのエラー */
export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
  }
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError("no_key", "APIキーが設定されていません。.env.local に ANTHROPIC_API_KEY を設定し、開発用サーバーを再起動してください。");
  }
  // 再試行はこちらで管理する（60秒の上限を守るため、SDKの自動再試行は使わない）
  client ??= new Anthropic({ maxRetries: 0 });
  return client;
}

export type Effort = "low" | "medium" | "high";

type CallOptions = {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  effort: Effort;
  /** この時刻（ミリ秒）までに終わらなければ打ち切る */
  deadline: number;
  maxTokens?: number;
};

export type JsonResult = {
  data: unknown;
  /** AIが返したJSONの文字列（自動修正の会話に使う） */
  raw: string;
};

export async function callClaudeJson(opts: CallOptions): Promise<JsonResult> {
  const remaining = opts.deadline - Date.now();
  if (remaining < 2_000) {
    throw new AiError("timeout", "60秒以内に処理が終わらなかったため、中止しました。入力はそのまま残っています。再試行してください。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const res = await getClient().beta.messages.create(
      {
        model: MODEL,
        max_tokens: opts.maxTokens ?? 8_000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: opts.system,
        messages: opts.messages,
        output_config: {
          effort: opts.effort,
          format: { type: "json_schema", schema: opts.schema },
        },
      },
      { signal: controller.signal, timeout: remaining },
    );

    console.info(
      `[claude] model=${res.model} stop=${res.stop_reason} in=${res.usage.input_tokens} out=${res.usage.output_tokens}`,
    );

    if (res.stop_reason === "refusal") {
      throw new AiError("refusal", "AIがこの内容への回答を控えました。入力内容を見直して、もう一度お試しください。");
    }
    if (res.stop_reason === "max_tokens") {
      throw new AiError("format", "AIの回答が長くなりすぎて途中で終わりました。もう一度お試しください。");
    }

    const raw = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    try {
      return { data: JSON.parse(raw), raw };
    } catch {
      throw new AiError("format", "AIの回答を読み取れませんでした。もう一度お試しください。");
    }
  } catch (e) {
    throw toAiError(e);
  } finally {
    clearTimeout(timer);
  }
}

/** SDKのエラーを、利用者向けの理由つきエラーに変換する（具体的なものから順に判定） */
function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.APIUserAbortError || e instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiError("timeout", "60秒以内に処理が終わらなかったため、中止しました。入力はそのまま残っています。再試行してください。");
  }
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new AiError("auth", "APIキーが正しくないか、使えない状態です。Claude Console でキーを確認してください。");
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new AiError("rate_limited", "AIの利用が一時的に集中しています。少し時間をおいて再試行してください。");
  }
  if (e instanceof Anthropic.BadRequestError) {
    console.error("[claude] bad request", e.message);
    return new AiError("unknown", "AIへの依頼の形式に問題がありました。時間をおいて再試行してください。");
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new AiError("network", "AIのサーバーに接続できませんでした。インターネット接続を確認して再試行してください。");
  }
  if (e instanceof Anthropic.APIError) {
    if (e.status === 529 || (e.status ?? 0) >= 500) {
      return new AiError("overloaded", "AIのサーバーが混み合っています。少し時間をおいて再試行してください。");
    }
    console.error("[claude] api error", e.status, e.message);
    return new AiError("unknown", "AIの処理でエラーが起きました。時間をおいて再試行してください。");
  }
  console.error("[claude] unexpected error", e);
  return new AiError("unknown", "AIの処理でエラーが起きました。時間をおいて再試行してください。");
}
