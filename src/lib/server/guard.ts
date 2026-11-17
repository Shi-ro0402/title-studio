// API の入口で使う確認（サーバー専用）
// proxy でも確認しているが、API でも必ずもう一度確認する（二重の守り）

import { readSessionCookie, verifySessionToken } from "./session";

export function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: { code, message, ...extra } }, { status });
}

/** 合言葉を通過していればブラウザIDを、そうでなければ 401 の応答を返す */
export async function requireSession(request: Request): Promise<{ browserId: string } | Response> {
  const session = await verifySessionToken(readSessionCookie(request));
  if (!session) {
    return jsonError(401, "unauthorized", "合言葉の確認が必要です。もう一度合言葉を入力してください。");
  }
  return session;
}

export function formatWait(sec: number): string {
  if (sec < 60) return `${sec}秒`;
  return `${Math.ceil(sec / 60)}分`;
}
