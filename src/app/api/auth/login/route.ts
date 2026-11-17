// 合言葉の確認 API
// GET  /api/auth/login … 合言葉が設定済みか（画面の案内用。合言葉そのものは返さない）
// POST /api/auth/login … 合言葉を確認し、正しければ署名付き Cookie（14日有効）を発行する

import { NextResponse } from "next/server";
import { formatWait, jsonError } from "@/lib/server/guard";
import { clientIdOf, loginLockRemaining, recordLoginFailure, resetLoginFailures } from "@/lib/server/limits";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  authConfigured,
  createSessionToken,
  readSessionCookie,
  safeEqual,
  sha256Hex,
  verifySessionToken,
} from "@/lib/server/session";
import { StoreNotConfiguredError } from "@/lib/server/store";

export async function GET() {
  return Response.json({ ok: true, configured: authConfigured() });
}

export async function POST(request: Request) {
  if (!authConfigured()) {
    return jsonError(503, "not_configured", "合言葉がまだ設定されていません。管理者は .env.local に ACCESS_PASSPHRASE と SESSION_SECRET（32文字以上）を設定し、サーバーを再起動してください。");
  }

  let passphrase: unknown;
  try {
    ({ passphrase } = await request.json());
  } catch {
    return jsonError(400, "invalid_input", "リクエストの形式が正しくありません。");
  }
  if (typeof passphrase !== "string" || passphrase.trim() === "" || passphrase.length > 200) {
    return jsonError(400, "invalid_input", "合言葉を入力してください。");
  }

  const clientId = clientIdOf(request);
  try {
    const locked = await loginLockRemaining(clientId);
    if (locked > 0) {
      return jsonError(429, "locked", `合言葉を続けて間違えたため、入力を一時的に止めています。あと${formatWait(locked)}で再入力できます。`, { retryAfterSec: locked });
    }

    // 前後の空白を除いて比べる。比べる時間で中身を推測されないよう、ハッシュにしてから比べる
    const ok = safeEqual(await sha256Hex(passphrase.trim()), await sha256Hex(process.env.ACCESS_PASSPHRASE!.trim()));
    if (!ok) {
      const { lockSec, remainingTries } = await recordLoginFailure(clientId);
      if (lockSec > 0) {
        return jsonError(429, "locked", `合言葉を続けて間違えたため、入力を一時的に止めています。あと${formatWait(lockSec)}で再入力できます。`, { retryAfterSec: lockSec });
      }
      const hint = remainingTries <= 3 ? `あと${remainingTries}回間違えると、20分間入力できなくなります。` : "";
      return jsonError(401, "wrong", `合言葉が違います。${hint}`);
    }

    await resetLoginFailures(clientId);
    // すでに通過済みのブラウザなら、同じ識別IDを使い続ける（利用回数を引き継ぐ）
    const current = await verifySessionToken(readSessionCookie(request));
    const token = await createSessionToken(current?.browserId ?? crypto.randomUUID());

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, // JavaScript から読めないようにする
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    if (e instanceof StoreNotConfiguredError) {
      return jsonError(503, "store_not_configured", "回数を記録する保存先が設定されていないため、現在は利用できません。");
    }
    console.error("[auth/login] unexpected error", e);
    return jsonError(500, "unknown", "合言葉を確認できませんでした。時間をおいて再試行してください。");
  }
}
