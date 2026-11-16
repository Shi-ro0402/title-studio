"use client";

// 主・補助キーワードの操作（新規・リライト共通）
// ルール：主は1つ、補助は最大5個、同じ語を主と補助の両方に登録しない、
//         主を変える前に変更内容を確認し、旧主を勝手に補助へ移さない。

import { LIMITS } from "@/lib/limits";
import type { Mode } from "@/lib/steps";
import { countChars } from "@/lib/text";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

export function useKeywordOps(mode: Mode) {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const keywords = state.modes[mode].keywords;

  // 新規作成とリライトのキーワードは連携せず、それぞれのモードに保存する
  const save = (main: string | null, sub: string[]) =>
    dispatch({ type: "setKeywords", mode, keywords: { main, sub } });

  /** 主キーワードを設定する。エラーがあれば理由を返す */
  const setMain = (word: string): string | null => {
    const value = word.trim();
    if (!value) return "主キーワードを入力してください。";
    if (countChars(value) > LIMITS.keyword) return `${LIMITS.keyword}文字以内で入力してください。`;
    if (value === keywords.main) return null;
    const inSub = keywords.sub.includes(value);
    const messages: string[] = [];
    if (keywords.main) {
      messages.push(
        `主キーワードを「${keywords.main}」から「${value}」に変更します。`,
        "以前の主キーワードは補助キーワードに移りません。",
      );
    }
    if (inSub) messages.push(`「${value}」は補助キーワードから外れます。`);
    if (messages.length > 0 && !window.confirm(`${messages.join("\n")}\nよろしいですか？`)) return null;
    save(value, keywords.sub.filter((s) => s !== value));
    return null;
  };

  const clearMain = () => save(null, keywords.sub);

  /** 補助キーワードを追加する。エラーがあれば理由を返す */
  const addSub = (word: string): string | null => {
    const value = word.trim();
    if (!value) return "補助キーワードを入力してください。";
    if (countChars(value) > LIMITS.keyword) return `${LIMITS.keyword}文字以内で入力してください。`;
    if (value === keywords.main) return "主キーワードと同じ語は、補助キーワードに登録できません。";
    if (keywords.sub.includes(value)) return "すでに補助キーワードに追加されています。";
    if (keywords.sub.length >= LIMITS.subKeywords)
      return `補助キーワードは最大${LIMITS.subKeywords}個までです。`;
    save(keywords.main, [...keywords.sub, value]);
    return null;
  };

  const removeSub = (word: string) => save(keywords.main, keywords.sub.filter((s) => s !== word));

  return { keywords, setMain, clearMain, addSub, removeSub };
}
