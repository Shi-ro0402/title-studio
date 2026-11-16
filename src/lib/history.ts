"use client";

// 生成履歴（ブラウザの LocalStorage に保存）
// ・生成に成功し、件数・文字数・完全一致の確認を通った結果だけを、1回につき1件保存する
// ・新規・リライト合計で最新20件。21件目を保存するときに最も古い1件を消す
// ・記事の本文・抽出見出しは保存しない
// ・保存できなかったときも結果は使えるようにし、同じ結果を再保存できる（同じIDなら重複しない）

import { useSyncExternalStore } from "react";
import type { Candidate, NewDraft, TopRef } from "@/state/newDraft";
import type { RankRecord, RewriteDraft } from "@/state/rewriteDraft";
import type { Keywords } from "@/state/workspace";

export const HISTORY_LIMIT = 20;
const STORAGE_KEY = "title-studio:history:v1";
const CHANGE_EVENT = "title-studio:history-changed";

export type HistoryTitle = { text: string; aim: string; improvement?: string; evidence?: string };

export type HistoryEntry = {
  id: string;
  version: 1;
  createdAt: string;
  mode: "new" | "rewrite";
  keywords: Keywords;
  /** 企画条件（テーマ・ペルソナ・読者の疑問・要約・強み・改善したい点） */
  plan: Record<string, string>;
  tone: string;
  /** 調査条件と調査値（新規：調査候補、リライト：主キーワードの検索需要） */
  research: Pick<Candidate, "keyword" | "volume" | "source" | "checkedOn">[];
  /** 利用者が登録した検索上位 */
  refs: Pick<TopRef, "rank" | "title" | "url" | "checkedAt">[];
  titles: HistoryTitle[];
  /** リライトだけ：元記事URL・変更前タイトル・順位の記録 */
  rewrite?: { url: string; currentTitle: string; rank: RankRecord };
};

export type SaveStatus = "saved" | "failed" | "skipped";

// ---- 保存・読み込み（LocalStorage が使えない環境でも落ちないようにする） ----

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): HistoryEntry[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((e) => e && typeof e === "object" && e.version === 1 && Array.isArray(e.titles));
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** 1件保存する。同じIDがあれば置き換える（保存の再試行で重複させない）。成功したら true */
export function saveHistoryEntry(entry: HistoryEntry): boolean {
  if (typeof window === "undefined") return false;
  const others = parse(readRaw()).filter((e) => e.id !== entry.id);
  return write([entry, ...others].slice(0, HISTORY_LIMIT));
}

export function deleteHistoryEntry(id: string): boolean {
  return write(parse(readRaw()).filter((e) => e.id !== id));
}

export function clearHistory(): boolean {
  return write([]);
}

// ---- 画面から履歴を読む（保存・削除・別タブでの変更を反映する） ----

let cachedRaw: string | null = null;
let cachedEntries: HistoryEntry[] = [];
const EMPTY: HistoryEntry[] = [];

function getSnapshot(): HistoryEntry[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedEntries = parse(raw);
  }
  return cachedEntries;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 保存済みの履歴（新しい順）。サーバーでの表示時は空として扱う */
export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// ---- 生成結果から履歴の1件を作る（生成に使った条件をそのまま記録する） ----

function newHistoryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const refsOf = (refs: TopRef[]) =>
  refs.map((r) => ({ rank: r.rank.trim(), title: r.title.trim(), url: r.url.trim(), checkedAt: r.checkedAt }));

export function buildNewEntry(draft: NewDraft, keywords: Keywords, titles: HistoryTitle[]): HistoryEntry {
  return {
    id: newHistoryId(),
    version: 1,
    createdAt: new Date().toISOString(),
    mode: "new",
    keywords: { main: keywords.main, sub: [...keywords.sub] },
    plan: { ...draft.plan },
    tone: draft.tone,
    research: draft.candidates
      .filter((c) => c.keyword.trim())
      .map((c) => ({ keyword: c.keyword.trim(), volume: c.volume.trim(), source: c.source, checkedOn: c.checkedOn })),
    refs: refsOf(draft.topRefs),
    titles: titles.map((t) => ({ text: t.text, aim: t.aim })),
  };
}

export function buildRewriteEntry(draft: RewriteDraft, keywords: Keywords, titles: HistoryTitle[]): HistoryEntry {
  return {
    id: newHistoryId(),
    version: 1,
    createdAt: new Date().toISOString(),
    mode: "rewrite",
    keywords: { main: keywords.main, sub: [...keywords.sub] },
    plan: { ...draft.plan },
    tone: draft.tone,
    research: keywords.main
      ? [{ keyword: keywords.main, volume: draft.demand.volume.trim(), source: draft.demand.source, checkedOn: draft.demand.checkedOn }]
      : [],
    refs: refsOf(draft.topRefs),
    // 根拠は生成結果の短い説明だけを保存する（本文全体は保存しない）
    titles: titles.map((t) => ({ text: t.text, aim: t.aim, improvement: t.improvement, evidence: t.evidence })),
    rewrite: { url: draft.loaded?.url ?? draft.url.trim(), currentTitle: draft.currentTitle.trim(), rank: { ...draft.rank } },
  };
}
