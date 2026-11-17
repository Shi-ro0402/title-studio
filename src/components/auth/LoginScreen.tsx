"use client";

// 合言葉の画面。アプリ名・合言葉の入力欄・「入る」ボタンだけを表示する（作業画面・履歴は表示しない）

import { PassphraseForm } from "./PassphraseForm";

export function LoginScreen() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-indigo-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Title Studio</h1>
        <p className="mb-5 text-xs text-slate-500">AI記事タイトル候補ジェネレーター</p>
        <PassphraseForm onSuccess={() => window.location.replace("/")} />
      </div>
    </main>
  );
}
