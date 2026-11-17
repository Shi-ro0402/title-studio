"use client";

// 画面側の「残り回数」。サーバーの記録にもとづく値だけを表示する（推測値は出さない）。
// AI処理の応答に含まれる最新の値で更新し、合言葉の確認が必要になったら再入力画面を開く合図を出す。

import { useSyncExternalStore } from "react";

export type Usage = {
  limit: number;
  remaining: number;
  retryAfterSec: number;
  windowMinutes: number;
};

type State = { usage: Usage | null; fetchedAt: number };

let state: State = { usage: null, fetchedAt: 0 };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function setUsage(usage: Usage) {
  emit({ usage, fetchedAt: Date.now() });
}

export async function refreshUsage(): Promise<void> {
  try {
    const res = await fetch("/api/usage", { cache: "no-store" });
    const data = await res.json();
    if (data?.ok && data.usage) setUsage(data.usage);
    else if (data?.error?.code === "unauthorized") requestReauth();
  } catch {
    // 取得できないときは表示を変えない（推測値は出さない）
  }
}

const INITIAL: State = { usage: null, fetchedAt: 0 };

export function useUsage(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => INITIAL,
  );
}

// ---- 合言葉の再入力（作業中に期限が切れたとき） ----

export const REAUTH_EVENT = "title-studio:reauth";

export function requestReauth() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REAUTH_EVENT));
}
