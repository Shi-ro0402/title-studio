// 合言葉を通過した印（署名付き Cookie）の作成と確認（サーバー専用）
// ・中身：ブラウザの識別ID・発行日時・有効期限・合言葉の版（合言葉を変えると全員無効になる）
// ・SESSION_SECRET で署名し、改ざんされた印は受け付けない
// ・proxy（ページの手前）と API の両方で使うため、Web Crypto で書いている

export const SESSION_COOKIE = "ts_session";
export const SESSION_DAYS = 14;
export const SESSION_MAX_AGE_SEC = SESSION_DAYS * 24 * 60 * 60;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): string {
  const pad = text.length % 4 === 0 ? "" : "=".repeat(4 - (text.length % 4));
  return atob(text.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 長さが同じなら、全文字を比べ終えるまで結果を決めない（比べる時間で中身を推測されないようにする） */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 合言葉とSESSION_SECRETが設定されているか */
export function authConfigured(): boolean {
  const secret = process.env.SESSION_SECRET ?? "";
  return Boolean(process.env.ACCESS_PASSPHRASE?.trim()) && secret.length >= 32;
}

/** 合言葉の「版」。合言葉を変えると値が変わり、以前の印は使えなくなる */
async function passphraseVersion(): Promise<string> {
  return (await sha256Hex(`v1:${process.env.ACCESS_PASSPHRASE?.trim() ?? ""}`)).slice(0, 16);
}

type Payload = { v: 1; bid: string; iat: number; exp: number; pv: string };

export async function createSessionToken(browserId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Payload = { v: 1, bid: browserId, iat: now, exp: now + SESSION_MAX_AGE_SEC, pv: await passphraseVersion() };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await hmac(process.env.SESSION_SECRET ?? "", body)}`;
}

/** 印が正しく、期限内で、今の合言葉の版と一致すればブラウザIDを返す。そうでなければ null */
export async function verifySessionToken(token: string | undefined | null): Promise<{ browserId: string } | null> {
  if (!token || !authConfigured()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(process.env.SESSION_SECRET ?? "", body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(fromB64url(body)) as Payload;
    if (payload.v !== 1 || typeof payload.bid !== "string") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.pv !== (await passphraseVersion())) return null;
    return { browserId: payload.bid };
  } catch {
    return null;
  }
}

/** Cookie ヘッダーから印を取り出す */
export function readSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
}
