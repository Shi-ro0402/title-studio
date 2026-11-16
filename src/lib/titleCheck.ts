// 生成タイトルのプログラムによる確認（要件定義 13．）
// 件数・文字数・完全一致（候補同士／登録参考タイトル）を確認する。
// 意味や表現の類似はAIが補助確認し、最終判断は人が行う。

import { LIMITS } from "./limits";
import { countChars } from "./text";

export type TitleIssue = {
  /** 対象の案（0始まり）。全体の問題は null */
  index: number | null;
  message: string;
};

export function checkTitles(titles: string[], referenceTitles: string[]): TitleIssue[] {
  const issues: TitleIssue[] = [];

  if (titles.length !== LIMITS.titleCount) {
    issues.push({
      index: null,
      message: `候補が${titles.length}件です（${LIMITS.titleCount}件必要）。`,
    });
  }

  const seen = new Map<string, number>();
  const refs = new Set(referenceTitles.map((t) => t.trim()).filter(Boolean));

  titles.forEach((title, i) => {
    const text = title.trim();
    const n = countChars(text);
    if (n < LIMITS.titleMin || n > LIMITS.titleMax) {
      issues.push({
        index: i,
        message: `${n}文字です（${LIMITS.titleMin}〜${LIMITS.titleMax}文字が必要）。`,
      });
    }
    const first = seen.get(text);
    if (first !== undefined) {
      issues.push({ index: i, message: `${first + 1}番目の候補と完全に一致しています。` });
    } else {
      seen.set(text, i);
    }
    if (refs.has(text)) {
      issues.push({ index: i, message: "登録した参考タイトルと完全に一致しています。" });
    }
  });

  return issues;
}
