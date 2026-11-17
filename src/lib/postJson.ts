// 画面からサーバーの API を呼ぶ共通処理。
// 失敗したときは、理由がわかる UserFacingError にして投げる。
// 応答に残り回数が含まれていれば表示を更新し、合言葉の確認が必要なら再入力画面を開く。

import { requestReauth, setUsage, type Usage } from "./usage";
import { UserFacingError } from "./userError";

export async function postJson<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    const usage: Usage | undefined = data?.usage ?? data?.error?.usage;
    if (usage) setUsage(usage);
    if (!data || !data.ok) {
      if (data?.error?.code === "unauthorized") requestReauth();
      throw new UserFacingError(
        data?.error?.message ?? "処理に失敗しました。時間をおいて再試行してください。",
        data?.error?.code,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new UserFacingError("時間がかかりすぎたため、中止しました。入力はそのまま残っています。再試行してください。", "timeout");
    }
    throw new UserFacingError("通信に失敗しました。インターネット接続を確認して再試行してください。", "network");
  } finally {
    clearTimeout(timer);
  }
}
