// 文字数の数え方（要件定義 13．）
// 前後の空白を除き、句読点・記号・途中の空白を含めて数える。
// 絵文字や結合文字も見た目どおり1文字として数えるため、Intl.Segmenter を使う。

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("ja", { granularity: "grapheme" })
    : null;

export function countChars(value: string): number {
  const text = value.trim();
  if (!segmenter) return Array.from(text).length;
  return Array.from(segmenter.segment(text)).length;
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/** 必須・文字数上限のチェック。問題がなければ null */
export function checkText(
  value: string,
  { required, max }: { required: boolean; max: number },
): string | null {
  if (required && isBlank(value)) return "入力してください（空白だけの入力は不可）。";
  const n = countChars(value);
  if (n > max) return `${max}文字以内で入力してください（現在${n}文字、${n - max}文字超過）。`;
  return null;
}

/** http(s) のURLかどうか */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
