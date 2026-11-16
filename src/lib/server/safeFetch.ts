// 一般公開されたページのHTMLを安全に取得する（サーバー専用）
// ・接続する直前に、名前解決したIPアドレスが公開アドレスか確認する（DNSのすり替え対策）
// ・転送（リダイレクト）は自分でたどり、転送先も毎回確認する
// ・全体で最大15秒、受け取るデータは最大2MBまで

import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import { FetchError, isPrivateAddress, parsePublicUrl } from "./urlGuard";

export const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

/** 名前解決の結果に非公開アドレスが含まれていたら接続しない */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      const blocked = Object.assign(new Error("blocked address"), { code: "EBLOCKED" });
      return callback(blocked, "", 0);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

export type FetchedPage = {
  finalUrl: string;
  html: string;
};

export async function fetchPublicHtml(rawUrl: string): Promise<FetchedPage> {
  const deadline = Date.now() + FETCH_TIMEOUT_MS;
  let url = parsePublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url, deadline);
    if (res.redirect) {
      if (hop === MAX_REDIRECTS) {
        throw new FetchError("too_many_redirects", "転送（リダイレクト）が多すぎるため、読み込みを中止しました。");
      }
      url = parsePublicUrl(new URL(res.redirect, url).toString());
      continue;
    }
    return { finalUrl: url.toString(), html: res.html! };
  }
  throw new FetchError("too_many_redirects", "転送（リダイレクト）が多すぎるため、読み込みを中止しました。");
}

type OnceResult = { redirect?: string; html?: string };

function requestOnce(url: URL, deadline: number): Promise<OnceResult> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      reject(new FetchError("timeout", "15秒以内に読み込めなかったため、中止しました。"));
      return;
    }
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TitleStudio/0.1; article title helper)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "Accept-Language": "ja,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          resolve({ redirect: res.headers.location });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new FetchError("http_status", `ページを取得できませんでした（HTTP ${status}）。`));
          return;
        }
        const type = String(res.headers["content-type"] ?? "").toLowerCase();
        if (type && !type.includes("text/html") && !type.includes("application/xhtml+xml")) {
          res.resume();
          reject(new FetchError("not_html", "このURLはWebページ（HTML）ではないため読み込めません。"));
          return;
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > MAX_BYTES) {
          res.resume();
          reject(new FetchError("too_large", "ページが大きすぎるため読み込めません。本文を貼り付けてください。"));
          return;
        }

        // 圧縮されていれば展開する。展開後の大きさも上限で確認する
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          encoding === "gzip" ? res.pipe(zlib.createGunzip())
          : encoding === "deflate" ? res.pipe(zlib.createInflate())
          : encoding === "br" ? res.pipe(zlib.createBrotliDecompress())
          : res;

        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            reject(new FetchError("too_large", "ページが大きすぎるため読み込めません。本文を貼り付けてください。"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve({ html: decodeHtml(Buffer.concat(chunks), type) }));
        stream.on("error", () => reject(new FetchError("network", "ページの受信中にエラーが起きました。")));
      },
    );

    const timer = setTimeout(() => {
      req.destroy();
      reject(new FetchError("timeout", "15秒以内に読み込めなかったため、中止しました。"));
    }, remaining);

    req.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "EBLOCKED") {
        reject(new FetchError("blocked", "このURLは一般公開されたページではないため読み込めません。"));
      } else if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
        reject(new FetchError("dns", "サイトが見つかりませんでした。URLを確認してください。"));
      } else {
        reject(new FetchError("network", "サイトに接続できませんでした。時間をおいて再試行するか、本文を貼り付けてください。"));
      }
    });
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}

/** 文字コード（UTF-8・Shift_JIS・EUC-JPなど）を判定して文字列にする */
export function decodeHtml(buf: Buffer, contentType: string): string {
  const fromHeader = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  const head = buf.subarray(0, 4096).toString("latin1");
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}
