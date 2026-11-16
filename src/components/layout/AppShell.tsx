"use client";

import { WorkspaceProvider, useWorkspace } from "@/state/workspace";
import { Header } from "./Header";
import { HistoryPanel } from "./HistoryPanel";
import { KeywordSummary } from "./KeywordSummary";
import { MODE_THEME } from "./modeTheme";
import { ToastProvider } from "@/components/ui/Toast";
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
  const { mode, processing } = useWorkspace();
  const theme = MODE_THEME[mode];

  return (
    <div className={`flex min-h-full flex-1 flex-col ${theme.pageBg}`}>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
        <ModeSwitcher />
        <StepNav />
        {processing && (
          <p
            role="status"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {processing}…　AI処理中は画面の切り替え・入力変更ができません。
          </p>
        )}
        <KeywordSummary />
        <div className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <StepContent />
        </div>
        <p className="text-xs text-slate-600">
          作業途中の内容は保存しません。生成成功時の履歴のみ保存します。
        </p>
      </main>
      <HistoryPanel />
    </div>
  );
}
