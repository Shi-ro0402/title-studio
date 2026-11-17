// 利用回数の制限と、合言葉の誤入力ロック（サーバー専用）
// ・AI処理：ブラウザごとに、直近20分間で10回まで。11回目は止めて、再開までの時間を返す
// ・合言葉：同じ接続元で連続10回間違えたら20分間ロック。正しく入力したら失敗回数をリセット
// 注：同時に大量のリクエストが来た場合の厳密さより、わかりやすさを優先している（小人数での利用を想定）

import { getStore } from "./store";

export const USAGE_LIMIT = 10;
export const USAGE_WINDOW_SEC = 20 * 60;
export const LOGIN_MAX_FAILS = 10;
export const LOGIN_LOCK_SEC = 20 * 60;

export type Usage = {
  limit: number;
  remaining: number;
  /** 上限に達しているとき、次に1回使えるようになるまでの秒数 */
  retryAfterSec: number;
  windowMinutes: number;
};

const usageKey = (browserId: string) => `usage:${browserId}`;

async function readStamps(browserId: string): Promise<number[]> {
  const raw = await getStore().get(usageKey(browserId));
  const now = Date.now();
  try {
    const list = JSON.parse(raw ?? "[]") as number[];
    return list.filter((t) => typeof t === "number" && t > now - USAGE_WINDOW_SEC * 1000);
  } catch {
    return [];
  }
}

function toUsage(stamps: number[]): Usage {
  const remaining = Math.max(0, USAGE_LIMIT - stamps.length);
  const oldest = stamps.length > 0 ? Math.min(...stamps) : Date.now();
  const retryAfterSec = remaining > 0 ? 0 : Math.max(1, Math.ceil((oldest + USAGE_WINDOW_SEC * 1000 - Date.now()) / 1000));
  return { limit: USAGE_LIMIT, remaining, retryAfterSec, windowMinutes: USAGE_WINDOW_SEC / 60 };
}

export async function getUsage(browserId: string): Promise<Usage> {
  return toUsage(await readStamps(browserId));
}

/** 1回分を使う。上限に達していれば使わずに ok: false を返す */
export async function consumeUsage(browserId: string): Promise<{ ok: boolean; usage: Usage; stamp: number }> {
  const stamps = await readStamps(browserId);
  if (stamps.length >= USAGE_LIMIT) return { ok: false, usage: toUsage(stamps), stamp: 0 };
  // 同じミリ秒に複数回使っても、1回ずつ区別できるように時刻をずらす
  const stamp = Math.max(Date.now(), ...stamps.map((t) => t + 1));
  const next = [...stamps, stamp];
  await getStore().set(usageKey(browserId), JSON.stringify(next), USAGE_WINDOW_SEC);
  return { ok: true, usage: toUsage(next), stamp };
}

/** AIの回答が得られなかった（こちらやAI側の事情で処理できなかった）場合に、使った1回を戻す */
export async function refundUsage(browserId: string, stamp: number): Promise<Usage> {
  const stamps = await readStamps(browserId);
  const index = stamps.indexOf(stamp);
  if (index >= 0) stamps.splice(index, 1); // 該当する1回だけを戻す
  await getStore().set(usageKey(browserId), JSON.stringify(stamps), USAGE_WINDOW_SEC);
  return toUsage(stamps);
}

// ---- 合言葉の誤入力ロック ----

type LoginState = { fails: number; lockedUntil: number };
const loginKey = (clientId: string) => `login:${clientId}`;

async function readLogin(clientId: string): Promise<LoginState> {
  try {
    const value = JSON.parse((await getStore().get(loginKey(clientId))) ?? "null") as LoginState | null;
    return value ?? { fails: 0, lockedUntil: 0 };
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
}

/** ロック中なら、解除までの秒数を返す。ロックされていなければ 0 */
export async function loginLockRemaining(clientId: string): Promise<number> {
  const state = await readLogin(clientId);
  return Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
}

/** 誤入力を1回記録する。10回目でロックし、ロック秒数を返す（ロックしなければ 0） */
export async function recordLoginFailure(clientId: string): Promise<{ lockSec: number; remainingTries: number }> {
  const state = await readLogin(clientId);
  const fails = state.fails + 1;
  if (fails >= LOGIN_MAX_FAILS) {
    const lockedUntil = Date.now() + LOGIN_LOCK_SEC * 1000;
    await getStore().set(loginKey(clientId), JSON.stringify({ fails: 0, lockedUntil }), LOGIN_LOCK_SEC);
    return { lockSec: LOGIN_LOCK_SEC, remainingTries: 0 };
  }
  // 連続した誤入力を数える（1日たてば数え直し）
  await getStore().set(loginKey(clientId), JSON.stringify({ fails, lockedUntil: 0 }), 24 * 60 * 60);
  return { lockSec: 0, remainingTries: LOGIN_MAX_FAILS - fails };
}

export async function resetLoginFailures(clientId: string): Promise<void> {
  await getStore().del(loginKey(clientId));
}

/** 接続元の識別（Vercel では x-forwarded-for に利用者のIPアドレスが入る） */
export function clientIdOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
