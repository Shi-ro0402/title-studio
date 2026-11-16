"use client";

// AI処理を実行するボタン。「AI利用 1回」を明記し、処理中は文言を変える。

import { useState } from "react";
import { MODE_THEME } from "@/components/layout/modeTheme";
import { UserFacingError } from "@/lib/userError";
import { useCurrentMode, useWorkspace, useWorkspaceDispatch } from "@/state/workspace";

type AiButtonProps = {
  label: string;
  busyLabel: string;
  running: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function AiButton({ label, busyLabel, running, disabled, onClick }: AiButtonProps) {
  const { mode, locked } = useCurrentMode();
  const theme = MODE_THEME[mode];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || locked}
      className={`inline-flex flex-col items-center rounded-md px-5 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${theme.primaryButton}`}
    >
      <span className="text-sm">{running ? busyLabel : label}</span>
      <span className="text-xs font-normal opacity-90">AI利用 1回</span>
    </button>
  );
}

/**
 * AI処理を実行する仕組み。処理中は画面全体の移動・入力を止め、終わったら解除する。
 * 失敗しても入力はそのまま残し、手動で再試行できるようにする。
 */
export function useAiRunner() {
  const { processing } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(stageLabel: string, task: () => Promise<T>): Promise<T | undefined> {
    if (processing) return undefined;
    setError(null);
    setRunning(true);
    dispatch({ type: "startProcessing", label: stageLabel });
    try {
      return await task();
    } catch (e) {
      // 理由がわかるエラーはそのまま見せる。それ以外は共通の文言にする
      setError(
        e instanceof UserFacingError
          ? `${e.message}（入力内容はそのまま残っています）`
          : "処理に失敗しました。入力内容はそのまま残っています。もう一度お試しください。",
      );
      return undefined;
    } finally {
      dispatch({ type: "endProcessing" });
      setRunning(false);
    }
  }

  return { run, running, error };
}

export function AiError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  const { locked } = useCurrentMode();
  if (!message) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={locked}
        className="rounded border border-red-300 bg-white px-3 py-1 text-red-800 disabled:opacity-50"
      >
        再試行
      </button>
    </div>
  );
}
