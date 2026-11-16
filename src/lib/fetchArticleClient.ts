// 画面から記事URLの読み込み API を呼ぶ

import type { FetchedArticle } from "./api";
import { postJson } from "./postJson";

// サーバー側は15秒で打ち切る。通信の往復分の余裕を見て、画面側は20秒で諦める
const CLIENT_TIMEOUT_MS = 20_000;

export async function fetchArticle({ url }: { url: string }): Promise<FetchedArticle> {
  const data = await postJson<{ article: FetchedArticle }>("/api/fetch-article", { url }, CLIENT_TIMEOUT_MS);
  return data.article;
}
