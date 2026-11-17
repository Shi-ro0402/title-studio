"use client";

// 合言葉の入力欄（合言葉の画面と、期限切れ時の再入力画面で共通）
// 入力は伏せ字で表示し、「表示する」で確認できる。前後の空白はサーバーで除いて判定する。

import { useEffect, useRef, useState } from "react";

export function PassphraseForm({ onSuccess, autoFocus = true }: { onSuccess: () => void; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    fetch("/api/auth/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d?.configured)))
      .catch(() => setConfigured(null));
  }, [autoFocus]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !value.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: value }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setValue("");
        onSuccess();
        return;
      }
      setError(data?.error?.message ?? "合言葉を確認できませんでした。時間をおいて再試行してください。");
    } catch {
      setError("通信に失敗しました。インターネット接続を確認して再試行してください。");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {configured === false && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          合言葉がまだ設定されていません。管理者に連絡してください。
        </p>
      )}
      <label htmlFor="passphrase" className="text-sm font-bold text-slate-800">合言葉</label>
      <div className="flex gap-2">
        <input
          id="passphrase"
          ref={inputRef}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={sending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "passphrase-error" : undefined}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
        />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-pressed={visible}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">
          {visible ? "隠す" : "表示する"}
        </button>
      </div>
      {error && <p id="passphrase-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={sending || !value.trim()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
        {sending ? "確認中…" : "入る"}
      </button>
      <p className="text-xs text-slate-500">一度通過すると、このブラウザでは14日間入力不要です。</p>
    </form>
  );
}
