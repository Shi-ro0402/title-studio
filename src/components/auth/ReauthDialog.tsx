"use client";

// 作業中に合言葉の期限が切れたときの再入力画面。
// ページを移動しないので、同じページ内の入力内容はそのまま残る。通過後に、もう一度操作してもらう。

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { REAUTH_EVENT, refreshUsage } from "@/lib/usage";
import { PassphraseForm } from "./PassphraseForm";

export function ReauthDialog() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const onReauth = () => setOpen(true);
    window.addEventListener(REAUTH_EVENT, onReauth);
    return () => window.removeEventListener(REAUTH_EVENT, onReauth);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="reauth-title"
        className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id="reauth-title" className="text-lg font-bold text-slate-900">合言葉を入力してください</h2>
        <p className="mb-4 mt-1 text-xs text-slate-600">
          合言葉の有効期限が切れたか、合言葉が変更されました。入力中の内容はそのまま残っています。
        </p>
        <PassphraseForm
          onSuccess={() => {
            setOpen(false);
            refreshUsage();
            toast("合言葉を確認しました。もう一度操作してください");
          }}
        />
      </section>
    </div>
  );
}
