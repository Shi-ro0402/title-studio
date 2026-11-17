"use client";

import { useEffect } from "react";
import { ReauthDialog } from "@/components/auth/ReauthDialog";
import { ToastProvider } from "@/components/ui/Toast";
import { useUsage } from "@/lib/usage";
import { MODE_LABEL } from "@/lib/steps";
import { WorkspaceProvider, hasWorkInProgress, useWorkspace, useWorkspaceDispatch } from "@/state/workspace";
import { Header } from "./Header";
import { HistoryPanel } from "./HistoryPanel";
import { KeywordSummary } from "./KeywordSummary";
import { MODE_THEME } from "./modeTheme";
import { ModeSwitcher } from "./ModeSwitcher";
import { StepContent } from "./StepContent";
import { StepNav } from "./StepNav";

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ToastProvider>
        <Workspace />
      </ToastProvider>
    </WorkspaceProvider>
  );
}

function Workspace() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { mode, processing } = state;
  const theme = MODE_THEME[mode];
  const dirty = hasWorkInProgress(state);

  // 途中入力があるときだけ、再読み込み・ページ離脱でブラウザ標準の確認を出す。
  // 工程・モードの切り替えはページ内の移動なので確認しない。
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const clear = () => {
    if (
      !window.confirm(
        `${MODE_LABEL[mode]}の入力内容・分析結果・生成候補をすべて消して、①から始め直します。\n生成履歴は削除されません。よろしいですか？`,
      )
    )
      return;
    dispatch({ type: "clearMode" });
  };

  return (
    <div className={`flex min-h-full flex-1 flex-col ${theme.pageBg}`}>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
        <ModeSwitcher />
        <StepNav />
        {processing && (
          <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {processing}…　AI処理中は画面の切り替え・入力変更ができません。
          </p>
        )}
        <UsageLimitNotice />
        <KeywordSummary />
        <div className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <StepContent />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            作業途中の内容は保存しません。生成成功時の履歴のみ保存します。
          </p>
          <button
            type="button"
            onClick={clear}
            disabled={processing !== null}
            className="rounded-md px-2 py-1 text-xs text-slate-600 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {MODE_LABEL[mode]}の入力をクリア
          </button>
        </div>
      </main>
      <HistoryPanel />
      <ReauthDialog />
    </div>
  );
}

/** 利用上限に達しているときの案内。閲覧・コピー・工程移動は続けられる */
function UsageLimitNotice() {
  const { usage } = useUsage();
  if (!usage || usage.remaining > 0) return null;
  return (
    <p role="status" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
      直近{usage.windowMinutes}分間の利用上限（{usage.limit}回）に達しました。あと約{Math.ceil(usage.retryAfterSec / 60)}分で再開できます。閲覧・コピー・工程の移動は続けられます。
    </p>
  );
}
