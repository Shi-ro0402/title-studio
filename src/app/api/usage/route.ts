// 残り回数の確認 API（GET /api/usage）。サーバー側の記録にもとづく値だけを返す

import { jsonError, requireSession } from "@/lib/server/guard";
import { getUsage } from "@/lib/server/limits";
import { StoreNotConfiguredError } from "@/lib/server/store";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json({ ok: true, usage: await getUsage(session.browserId) });
  } catch (e) {
    if (e instanceof StoreNotConfiguredError) {
      return jsonError(503, "store_not_configured", "回数を記録する保存先が設定されていないため、現在は利用できません。");
    }
    console.error("[usage] unexpected error", e);
    return jsonError(500, "unknown", "残り回数を確認できませんでした。");
  }
}
