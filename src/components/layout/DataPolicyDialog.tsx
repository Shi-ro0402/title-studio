"use client";

// 「データの扱いについて」：外部AIへ送る情報と、ブラウザ・サーバーに残る情報の説明（要件定義 21．）

import { useEffect, useRef } from "react";

export function DataPolicyDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="data-policy-title"
        className="relative flex h-full w-full flex-col bg-white shadow-xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="data-policy-title" className="text-lg font-bold text-slate-900">データの扱いについて</h2>
          <button ref={closeRef} type="button" onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
            閉じる
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4 text-sm text-slate-700">
          <Section title="外部のAI（Claude）に送る情報">
            <p>AIのボタン（「AI利用 1回」と書かれたもの）を押したときだけ、次の情報をこのアプリのサーバー経由で Anthropic 社の Claude API に送ります。</p>
            <ul className="list-disc pl-5">
              <li>入力したキーワード、企画条件（テーマ・ペルソナ・読者の疑問・要約・強み・改善したい点）、トーン、補足質問への回答</li>
              <li>登録した検索上位のタイトル</li>
              <li>タイトルリライトでは、現在のタイトル・記事の本文・見出し</li>
            </ul>
            <p>個人情報や社外秘の内容は入力しないでください。送った情報の扱いは Anthropic 社の規約に従います。</p>
          </Section>

          <Section title="記事URLの読み込み">
            <p>「読み込む」を押すと、このアプリのサーバーが、指定された一般公開ページを取得します（読み取るだけで、公開元のサイトは変更しません）。取得した本文はAIには送らず、「記事を分析する」などを押したときだけ送ります。</p>
          </Section>

          <Section title="このブラウザに保存する情報">
            <ul className="list-disc pl-5">
              <li><b>生成履歴</b>：タイトル生成に成功した結果（10案・生成条件など）を、新規・リライト合計で最新20件まで保存します。記事の本文・見出しは保存しません。履歴画面からいつでも削除できます。</li>
              <li><b>合言葉を通過した印</b>：14日間、合言葉の再入力を省くための Cookie です。</li>
            </ul>
            <p>作業途中の入力・本文・分析結果は保存しません。ページを再読み込みすると消えます。別の端末やブラウザとは同期しません。</p>
          </Section>

          <Section title="サーバーに記録する情報">
            <ul className="list-disc pl-5">
              <li><b>AIの利用回数</b>：ブラウザごとの識別番号と利用した時刻を、20分間だけ記録します（直近20分で10回の制限のため）。</li>
              <li><b>合言葉の失敗回数</b>：接続元（IPアドレス）ごとに、最大24時間記録します（連続10回の誤入力で20分間止めるため）。</li>
            </ul>
            <p>入力内容や生成したタイトルは、サーバーには保存しません。</p>
          </Section>

          <Section title="生成結果について">
            <p>タイトル候補は、検索順位の上昇・アクセス数の増加・AI検索での掲載を保証するものではありません。正確さや採用するかどうかは、ご自身で判断してください。</p>
          </Section>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}
