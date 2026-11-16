"use client";

// 本文の拡大編集。PCは画面の約7割、スマートフォンは全画面。
// 開くときに本文を作業用にコピーし、「変更を反映」で通常の本文欄へ戻す。
// 「キャンセル」では拡大画面での変更を破棄する。同じページ内の一時編集で、永続保存はしない。

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { LIMITS } from "@/lib/limits";
import { countChars } from "@/lib/text";

type BodyEditorModalProps = {
  initialBody: string;
  onApply: (body: string) => void;
  onClose: () => void;
};

export function BodyEditorModal({ initialBody, onApply, onClose }: BodyEditorModalProps) {
  const [working, setWorking] = useState(initialBody);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const count = countChars(working);
  const over = count > LIMITS.body;
  const dirty = working !== initialBody;

  // 未反映の変更が黙って失われないよう、閉じる前に確認する
  const requestClose = () => {
    if (dirty && !window.confirm("拡大画面での変更はまだ反映されていません。変更を破棄して閉じますか？")) return;
    onClose();
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (working === initialBody || window.confirm("拡大画面での変更はまだ反映されていません。変更を破棄して閉じますか？")) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working, initialBody, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50"
        aria-hidden="true"
        // 未反映の変更があるときは、外側のクリックだけでは閉じない
        onClick={() => {
          if (!dirty) onClose();
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-editor-title"
        className="relative flex h-full w-full flex-col bg-white shadow-xl md:h-[70vh] md:w-[70vw] md:rounded-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 id="body-editor-title" className="text-lg font-bold text-slate-900">本文を編集</h2>
          <p className={`text-sm ${over ? "font-bold text-red-700" : "text-slate-600"}`}>
            {count.toLocaleString()}／{LIMITS.body.toLocaleString()}文字
            {over && `（${(count - LIMITS.body).toLocaleString()}文字超過）`}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-hidden p-4">
          <label htmlFor="body-editor" className="sr-only">本文</label>
          <textarea
            id="body-editor"
            ref={textareaRef}
            className={`${inputClass} flex-1 resize-none leading-relaxed`}
            value={working}
            onChange={(e) => setWorking(e.target.value)}
          />
          {over && (
            <p className="text-sm text-red-700">
              {LIMITS.body.toLocaleString()}文字を超えています。今回タイトルで扱う範囲を残してください（自動で切り捨てはしません）。
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={requestClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            キャンセル
          </button>
          <button type="button" disabled={over}
            onClick={() => {
              onApply(working);
              onClose();
            }}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
            変更を反映
          </button>
        </div>
      </section>
    </div>
  );
}
