// 画面から記事URLの読み込み API を呼ぶ

import type { FetchedArticle } from "./api";
import { UserFacingError } from "./userError";

// サーバー側は15秒で打ち切る。通信の往復分の余裕を見て、画面側は20秒で諦める
const CLIENT_TIMEOUT_MS = 20_000;

export async function fetchArticle({ url }: { url: string }): Promise<FetchedArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/fetch-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) {
      throw new UserFacingError(
        data?.error?.message ?? "記事を読み込めませんでした。時間をおいて再試行するか、本文を貼り付けてください。",
        data?.error?.code,
      );
    }
    return data.article as FetchedArticle;
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new UserFacingError("読み込みに時間がかかりすぎたため、中止しました。本文を貼り付けて続けられます。", "timeout");
    }
    throw new UserFacingError("通信に失敗しました。インターネット接続を確認して再試行してください。", "network");
  } finally {
    clearTimeout(timer);
  }
}
