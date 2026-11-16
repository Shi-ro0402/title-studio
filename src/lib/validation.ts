// 各工程の入力チェック。戻り値は「項目 → 理由」の対応表。空なら問題なし。

import type { Keywords } from "@/state/workspace";
import type { NewDraft, TopRef } from "@/state/newDraft";
import type { RewriteDraft } from "@/state/rewriteDraft";
import { LIMITS } from "./limits";
import { checkText, countChars, isBlank, isHttpUrl } from "./text";

export type Errors = Record<string, string>;

export function hasErrors(errors: Errors): boolean {
  return Object.keys(errors).length > 0;
}

function checkVolume(volume: string): string | null {
  if (volume !== "" && !/^\d+$/.test(volume.trim())) {
    return "0以上の整数で入力してください（不明な場合は空欄）。";
  }
  return null;
}

function checkFields<F extends string>(
  values: Record<F, string>,
  rules: Record<F, { required: boolean; max: number }>,
): Errors {
  const errors: Errors = {};
  for (const field of Object.keys(rules) as F[]) {
    const message = checkText(values[field], rules[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

/** 登録した検索上位のチェック（新規③・リライト④共通） */
export function validateTopRefs(refs: TopRef[]): Errors {
  const errors: Errors = {};
  for (const r of refs) {
    if (!/^\d+$/.test(r.rank.trim()) || Number(r.rank) < 1) {
      errors[`ref.${r.id}.rank`] = "1以上の整数で入力してください。";
    }
    if (isBlank(r.title)) errors[`ref.${r.id}.title`] = "表示タイトルを入力してください。";
    if (!isHttpUrl(r.url)) errors[`ref.${r.id}.url`] = "http:// または https:// で始まるURLを入力してください。";
    if (isBlank(r.checkedAt)) errors[`ref.${r.id}.checkedAt`] = "確認日時を入力してください。";
  }
  return errors;
}

// ---- 新規作成 ----

export function validateKeywordStep(draft: NewDraft, keywords: Keywords): Errors {
  const errors: Errors = {};
  if (!keywords.main) errors.main = "主キーワードを1つ設定してください。";

  for (const c of draft.candidates) {
    if (isBlank(c.keyword)) {
      errors[`candidate.${c.id}.keyword`] = "キーワードを入力するか、この候補を削除してください。";
    } else if (countChars(c.keyword) > LIMITS.keyword) {
      errors[`candidate.${c.id}.keyword`] = `${LIMITS.keyword}文字以内で入力してください。`;
    }
    const volume = checkVolume(c.volume);
    if (volume) errors[`candidate.${c.id}.volume`] = volume;
  }
  return errors;
}

export function validatePlanStep(draft: NewDraft): Errors {
  return checkFields(draft.plan, {
    theme: { required: true, max: LIMITS.theme },
    persona: { required: true, max: LIMITS.persona },
    question: { required: true, max: LIMITS.question },
    summary: { required: false, max: LIMITS.summary },
    strength: { required: false, max: LIMITS.strength },
  });
}

export function validateTopStep(draft: NewDraft): Errors {
  return validateTopRefs(draft.topRefs);
}

// ---- タイトルリライト ----

export function validateLoadStep(draft: RewriteDraft): Errors {
  const errors: Errors = {};
  if (!isBlank(draft.url) && !isHttpUrl(draft.url)) {
    errors.url = "http:// または https:// で始まるURLを入力してください。";
  }
  const title = checkText(draft.currentTitle, { required: true, max: LIMITS.currentTitle });
  if (title) errors.currentTitle = title;
  if (isBlank(draft.body)) {
    errors.body = "本文を読み込むか、貼り付けてください。";
  } else {
    const n = countChars(draft.body);
    if (n > LIMITS.body) {
      errors.body = `本文が${LIMITS.body.toLocaleString()}文字を超えています（現在${n.toLocaleString()}文字、${(n - LIMITS.body).toLocaleString()}文字超過）。今回タイトルで扱う範囲を残してください。`;
    }
  }
  return errors;
}

export function validateRewriteKeywordStep(draft: RewriteDraft, keywords: Keywords): Errors {
  const errors: Errors = {};
  if (!keywords.main) errors.main = "主キーワードを1つ設定してください。";
  const volume = checkVolume(draft.demand.volume);
  if (volume) errors.volume = volume;
  if (draft.rank.status === "ranked" && (!/^\d+$/.test(draft.rank.rank.trim()) || Number(draft.rank.rank) < 1)) {
    errors.rank = "順位は1以上の整数で入力してください。";
  }
  return errors;
}

export function validateConditionStep(draft: RewriteDraft): Errors {
  return checkFields(draft.plan, {
    theme: { required: true, max: LIMITS.theme },
    persona: { required: true, max: LIMITS.persona },
    question: { required: true, max: LIMITS.question },
    summary: { required: true, max: LIMITS.summary },
    strength: { required: false, max: LIMITS.strength },
    improvement: { required: false, max: LIMITS.improvement },
  });
}

export function validateCompareStep(draft: RewriteDraft): Errors {
  return validateTopRefs(draft.topRefs);
}
