// 取得してよいURLかどうかの確認（サーバー専用）
// 社内ネットワーク・自分のPC・クラウドの管理用アドレスなどへの取得を防ぐ（SSRF対策）。

import { isIP } from "node:net";

export class FetchError extends Error {
  constructor(
    public code:
      | "invalid_url"
      | "blocked"
      | "dns"
      | "timeout"
      | "too_large"
      | "not_html"
      | "http_status"
      | "too_many_redirects"
      | "network"
      | "no_content",
    message: string,
  ) {
    super(message);
  }
}

/** URLの形式を確認する。問題があれば FetchError を投げる */
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchError("invalid_url", "URLの形式が正しくありません。");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchError("invalid_url", "http:// または https:// で始まるURLを入力してください。");
  }
  if (url.username || url.password) {
    throw new FetchError("invalid_url", "ユーザー名やパスワードを含むURLは読み込めません。");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new FetchError("blocked", "標準以外のポート番号を指定したURLは読み込めません。");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home.arpa") ||
    (!isIP(host) && !host.includes("."))
  ) {
    throw new FetchError("blocked", "このURLは一般公開されたページではないため読み込めません。");
  }
  if (isIP(host) && isPrivateAddress(host)) {
    throw new FetchError("blocked", "このURLは一般公開されたページではないため読み込めません。");
  }
  return url;
}

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0);
}

function inV4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : 2 ** 32 - 2 ** (32 - bits);
  return (ipv4ToNumber(ip) & mask) >>> 0 === (ipv4ToNumber(base) & mask) >>> 0;
}

const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8], // 「この」ネットワーク
  ["10.0.0.0", 8], // プライベート
  ["100.64.0.0", 10], // キャリアグレードNAT
  ["127.0.0.0", 8], // 自分自身
  ["169.254.0.0", 16], // リンクローカル（クラウドの管理用アドレスを含む）
  ["172.16.0.0", 12], // プライベート
  ["192.0.0.0", 24], // IETF予約
  ["192.0.2.0", 24], // 文書用
  ["192.168.0.0", 16], // プライベート
  ["198.18.0.0", 15], // ベンチマーク用
  ["198.51.100.0", 24], // 文書用
  ["203.0.113.0", 24], // 文書用
  ["224.0.0.0", 4], // マルチキャスト
  ["240.0.0.0", 4], // 予約・ブロードキャスト
];

/** 一般公開されていない（取得してはいけない）IPアドレスか */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return PRIVATE_V4.some(([base, bits]) => inV4Range(ip, base, bits));
  if (version === 6) {
    const lower = ip.toLowerCase();
    // IPv4をIPv6の形で書いたもの（::ffff:127.0.0.1 など）は、IPv4として確認する
    const mapped = lower.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    const first = parseInt(lower.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 ユニークローカル
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 リンクローカル
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 マルチキャスト
    if (lower.startsWith("64:ff9b:")) return true; // NAT64（IPv4の内部アドレスを指せるため）
    if (lower.startsWith("2001:db8:")) return true; // 文書用
    return false;
  }
  return true; // IPアドレスとして読めないものは安全側に倒す
}
