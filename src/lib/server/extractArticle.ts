// 取得したHTMLから、記事のタイトル・本文・見出しを取り出す（サーバー専用）
// メニュー・広告・フッター・関連記事などは @mozilla/readability が本文と区別する。
// 画像の中身は解析しない（枚数だけ数えて、未確認であることを画面に伝える）。

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { FetchError } from "./urlGuard";

export type ExtractedArticle = {
  title: string;
  body: string;
  headings: string[];
  /** 本文中の画像の枚数（内容は確認していない） */
  imageCount: number;
};

const MIN_BODY_CHARS = 100;

const BLOCK_TAGS = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "LI", "UL", "OL", "TABLE", "TR", "BLOCKQUOTE", "PRE",
  "H1", "H2", "H3", "H4", "H5", "H6", "FIGCAPTION", "DL", "DT", "DD", "ASIDE", "BR", "HR",
]);

export function extractArticle(html: string, pageUrl: string): ExtractedArticle {
  const { document } = parseHTML(html);
  const pageTitle = (document.querySelector("title")?.textContent ?? "").trim();

  // Readability は文書を書き換えるので、取り出す前に必要な情報を控えておく
  const fallbackHeadings = collectPageHeadings(document as unknown as Document);
  const reader = new Readability(document as unknown as Document, { charThreshold: 200 });
  const article = reader.parse();
  if (!article || !article.content) {
    throw new FetchError("no_content", "記事の本文を見つけられませんでした。タイトルと本文を貼り付けてください。");
  }

  const { document: contentDoc } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
  const root = contentDoc.body;

  const imageCount = root.querySelectorAll("img, picture, svg").length;

  const fromContent = Array.from(root.querySelectorAll("h1, h2, h3, h4"))
    .map((h) => normalize(h.textContent ?? ""))
    .filter(Boolean);
  // 見出しの横に編集リンクなどがあると、Readability が見出しごと消すことがある。
  // その場合は、元のページの記事部分から見出しを拾う
  const headings = fromContent.length > 0 ? fromContent : fallbackHeadings;

  // 表のセルは「 ｜ 」でつなぎ、ブロック要素の区切りで改行する
  root.querySelectorAll("td, th").forEach((cell) => cell.append(" ｜ "));
  root.querySelectorAll("script, style, noscript, iframe, img, picture, svg, video, audio").forEach((el) => el.remove());

  const body = toText(root).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // メニューだけのページなどで、本文と呼べない短い文字しか取れなかった場合は失敗扱いにする
  if (body.replace(/\s/g, "").length < MIN_BODY_CHARS) {
    throw new FetchError("no_content", "記事の本文を見つけられませんでした。タイトルと本文を貼り付けてください。");
  }

  const title = normalize(article.title || pageTitle) || new URL(pageUrl).hostname;
  return { title, body, headings, imageCount };
}

const NON_CONTENT_HEADING = /^(目次|関連記事|関連する記事|おすすめ記事|人気記事|新着記事|カテゴリー?|アーカイブ|メニュー|ナビゲーション|コメント|シェア|この記事を書いた人|プロフィール|contents|related|menu|navigation)/i;

/** 元のページの記事部分（main / article、なければヘッダー・メニュー・フッター・サイドバー以外）の見出し */
function collectPageHeadings(document: Document): string[] {
  const scope = document.querySelector("main") ?? document.querySelector("article") ?? document.body;
  if (!scope) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  scope.querySelectorAll("h1, h2, h3, h4").forEach((h) => {
    if (h.closest("header, nav, footer, aside")) return;
    const text = normalize(h.textContent ?? "");
    if (!text || NON_CONTENT_HEADING.test(text) || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });
  return result;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 要素を、段落の区切りを保ったテキストに変換する */
function toText(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += (child.textContent ?? "").replace(/\s+/g, " ");
    } else if (child.nodeType === 1) {
      const el = child as Element;
      const block = BLOCK_TAGS.has(el.tagName);
      if (block) out += "\n";
      out += toText(el);
      if (block) out += "\n";
    }
  });
  return out;
}
