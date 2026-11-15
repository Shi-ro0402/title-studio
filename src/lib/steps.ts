// 新規作成・タイトルリライトの工程の定義（画面設計書「画面一覧と必須項目」に対応）

export type Mode = "new" | "rewrite";

export type StepDef = {
  id: string;
  /** 工程タブに表示する短い名前 */
  label: string;
  /** 本文領域の見出し */
  title: string;
  /** その工程の目的 */
  purpose: string;
  /** 「次へ」ボタンの文言（最後の工程にはない） */
  nextLabel?: string;
};

export const MODE_LABEL: Record<Mode, string> = {
  new: "新規作成",
  rewrite: "タイトルリライト",
};

export const STEPS: Record<Mode, StepDef[]> = {
  new: [
    {
      id: "keyword",
      label: "キーワード",
      title: "キーワード調査と選定",
      purpose: "検索需要と候補を整理し、主・補助キーワードを選びます。",
      nextLabel: "選択したキーワードで記事企画へ",
    },
    {
      id: "plan",
      label: "記事企画",
      title: "記事企画",
      purpose: "ペルソナ・テーマ・記事に含める内容をまとめます。",
      nextLabel: "上位分析へ",
    },
    {
      id: "top",
      label: "上位分析",
      title: "上位分析",
      purpose: "上位最大5件のタイトルから傾向を確認します。",
      nextLabel: "タイトル候補へ",
    },
    {
      id: "titles",
      label: "タイトル",
      title: "タイトル候補",
      purpose: "条件に合うタイトル10案を比較・コピーします。",
    },
  ],
  rewrite: [
    {
      id: "load",
      label: "記事読込",
      title: "記事を読み込む",
      purpose: "公開記事の取得内容・本文を確認し、修正します。",
      nextLabel: "キーワード・順位へ",
    },
    {
      id: "keyword",
      label: "キーワード・順位",
      title: "キーワードと順位",
      purpose: "対象キーワードと任意の検索順位を記録します。",
      nextLabel: "条件確認へ",
    },
    {
      id: "condition",
      label: "条件確認",
      title: "記事条件を確認",
      purpose: "記事内容と検索意図の一致を確認します。",
      nextLabel: "上位比較へ",
    },
    {
      id: "compare",
      label: "上位比較",
      title: "上位タイトルと比較",
      purpose: "現在のタイトルと参考上位の共通点・相違点を確認します。",
      nextLabel: "改善案へ",
    },
    {
      id: "improve",
      label: "改善案",
      title: "改善タイトル候補",
      purpose: "本文に沿った10案を根拠とともに比較・コピーします。",
    },
  ],
};

/** 工程の状態（画面設計書：現在・未実施・完了・再確認が必要） */
export type StepStatus = "current" | "todo" | "done" | "recheck";

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  current: "現在",
  todo: "未実施",
  done: "完了",
  recheck: "再確認が必要",
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

export function stepNumber(index: number): string {
  return CIRCLED[index] ?? `${index + 1}`;
}
