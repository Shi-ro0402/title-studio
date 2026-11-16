"use client";

// 画面下に短いお知らせ（トースト）を出す仕組み

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <p
            key={t.id}
            role="status"
            className={`rounded-md px-4 py-2 text-sm font-medium shadow-lg ${
              t.kind === "success" ? "bg-slate-900 text-white" : "bg-red-700 text-white"
            }`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("ToastProvider の中で使ってください");
  return show;
}

/** 文字列をクリップボードへコピーする。成功したら true */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
