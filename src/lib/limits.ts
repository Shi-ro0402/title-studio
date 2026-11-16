// 入力文字数と件数の上限（要件定義 16．）

export const LIMITS = {
  keyword: 100,
  theme: 200,
  persona: 500,
  question: 500,
  summary: 500,
  strength: 500,
  improvement: 500,
  supplement: 500,
  currentTitle: 100,
  body: 5000,
  titleMin: 30,
  titleMax: 35,
  candidates: 5,
  subKeywords: 5,
  topRefs: 5,
  titleCount: 10,
} as const;
