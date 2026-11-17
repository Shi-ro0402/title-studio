// ページ・API の手前での確認（Next.js 16 の proxy。以前の middleware）
// 合言葉を通過していない場合：ページは合言葉の画面へ案内し、API は 401 を返す。
// ここでの確認は「手前の案内」で、各 API でも必ずもう一度確認している。

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

export async function proxy(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized", message: "合言葉の確認が必要です。もう一度合言葉を入力してください。" } },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // 合言葉の画面・合言葉のAPI・画像などの静的ファイルは、確認せずに通す
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
