// 新規作成の各工程の入力チェック。戻り値は「項目 → 理由」の対応表。空なら問題なし。

import type { Keywords } from "@/state/workspace";
import type { NewDraft } from "@/state/newDraft";
import { LIMITS } from "./limits";
import { checkText, countChars, isBlank, isHttpUrl } from "./text";

export type Errors = Record<string, string>;

export function validateKeywordStep(draft: NewDraft, keywords: Keywords): Errors {
  const errors: Errors = {};
  if (!keywords.main) errors.main = "主キーワードを1つ設定してください。";

  for (const c of draft.candidates) {
    if (isBlank(c.keyword)) {
      errors[`candidate.${c.id}.keyword`] =
        "キーワードを入力するか、この候補を削除してください。";
    } else if (countChars(c.keyword) > LIMITS.keyword) {
      errors[`candidate.${c.id}.keyword`] = `${LIMITS.keyword}文字以内で入力してください。`;
    }
    if (c.volume !== "" && !/^\d+$/.test(c.volume.trim())) {
      errors[`candidate.${c.id}.volume`] = "0以上の整数で入力してください（不明な場合は空欄）。";
    }
  }
  return errors;
}

export function validatePlanStep(draft: NewDraft): Errors {
  const errors: Errors = {};
  const rules = {
    theme: { required: true, max: LIMITS.theme },
    persona: { required: true, max: LIMITS.persona },
    question: { required: true, max: LIMITS.question },
    summary: { required: false, max: LIMITS.summary },
    strength: { required: false, max: LIMITS.strength },
  } as const;
  for (const [field, rule] of Object.entries(rules)) {
    const message = checkText(draft.plan[field as keyof typeof rules], rule);
    if (message) errors[field] = message;
  }
  return errors;
}

export function validateTopStep(draft: NewDraft): Errors {
  const errors: Errors = {};
  for (const r of draft.topRefs) {
    if (!/^\d+$/.test(r.rank.trim()) || Number(r.rank) < 1) {
      errors[`ref.${r.id}.rank`] = "1以上の整数で入力してください。";
    }
    if (isBlank(r.title)) errors[`ref.${r.id}.title`] = "表示タイトルを入力してください。";
    if (!isHttpUrl(r.url)) errors[`ref.${r.id}.url`] = "http:// または https:// で始まるURLを入力してください。";
    if (isBlank(r.checkedAt)) errors[`ref.${r.id}.checkedAt`] = "確認日時を入力してください。";
  }
  return errors;
}
