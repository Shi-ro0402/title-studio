// モードごとの配色。新規は青〜インディゴ、リライトは緑〜ティール。
// Tailwind はクラス名を文字列のまま検出するため、組み立てずに完全な名前で書く。

import type { Mode } from "@/lib/steps";

export type ModeTheme = {
  /** 画面全体の淡い背景 */
  pageBg: string;
  /** 主要ボタン */
  primaryButton: string;
  /** 選択中のモード切り替えボタン */
  modeActive: string;
  /** 選択中の工程タブ */
  stepActive: string;
  /** 工程番号の丸 */
  stepBadge: string;
  /** 見出しなどの強調文字 */
  accentText: string;
  /** 強調の枠線 */
  accentBorder: string;
};

export const MODE_THEME: Record<Mode, ModeTheme> = {
  new: {
    pageBg: "bg-indigo-50",
    primaryButton:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
    modeActive: "bg-indigo-600 text-white border-indigo-600",
    stepActive: "border-indigo-600 bg-white text-indigo-800",
    stepBadge: "bg-indigo-600 text-white",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
  },
  rewrite: {
    pageBg: "bg-teal-50",
    primaryButton:
      "bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-teal-600",
    modeActive: "bg-teal-600 text-white border-teal-600",
    stepActive: "border-teal-600 bg-white text-teal-800",
    stepBadge: "bg-teal-600 text-white",
    accentText: "text-teal-700",
    accentBorder: "border-teal-200",
  },
};
