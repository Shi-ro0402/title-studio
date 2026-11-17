// 記事URLの読み込み API（POST /api/fetch-article）
// ページを取得して、タイトル・本文・見出しを返す。AI処理ではないので利用回数に数えない。
// 公開元のWebサイトは変更しない（読み取りだけ）。

import { extractArticle } from "@/lib/server/extractArticle";
import { requireSession } from "@/lib/server/guard";
import { fetchPublicHtml } from "@/lib/server/safeFetch";
import { FetchError } from "@/lib/server/urlGuard";

const MAX_URL_LENGTH = 2048;

// 公開先（Vercel）で、この処理に使ってよい最大の秒数（取得15秒＋本文の取り出しの余裕）
export const maxDuration = 30;

export async function POST(request: Request) {
  // 合言葉を通過したブラウザだけが使える（利用回数は使わない）
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return error(400, "invalid_url", "リクエストの形式が正しくありません。");
  }
  if (typeof url !== "string" || url.trim() === "") {
    return error(400, "invalid_url", "URLを入力してください。");
  }
  if (url.length > MAX_URL_LENGTH) {
    return error(400, "invalid_url", "URLが長すぎます。");
  }

  try {
    const page = await fetchPublicHtml(url);
    const article = extractArticle(page.html, page.finalUrl);
    return Response.json({ ok: true, article: { ...article, finalUrl: page.finalUrl } });
  } catch (e) {
    if (e instanceof FetchError) {
      const status = e.code === "blocked" || e.code === "invalid_url" ? 400 : 502;
      return error(status, e.code, e.message);
    }
    console.error("fetch-article failed", e);
    return error(500, "unknown", "記事を読み込めませんでした。時間をおいて再試行するか、本文を貼り付けてください。");
  }
}

function error(status: number, code: string, message: string) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}
