"use client";

// 生成結果まわりの小さな部品（新規④・リライト⑤共通）

export function StepLinks({
  title, items, locked, onGo, tone,
}: { title: string; items: { label: string; step: number }[]; locked: boolean; onGo: (step: number) => void; tone: "error" | "warn" }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((m) => (
          <li key={m.step} className="flex flex-wrap items-center gap-2">
            <span className={tone === "error" ? "text-red-700" : "text-amber-800"}>・{m.label}</span>
            <button type="button" className="underline" disabled={locked} onClick={() => onGo(m.step)}>この工程へ移動</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ViewTabs({
  view, setView, titleLabel, refCount,
}: { view: "titles" | "refs"; setView: (v: "titles" | "refs") => void; titleLabel: string; refCount: number }) {
  const cls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${active ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-700"}`;
  return (
    <div role="tablist" aria-label="表示の切り替え" className="flex gap-2">
      <button type="button" role="tab" aria-selected={view === "titles"} onClick={() => setView("titles")} className={cls(view === "titles")}>
        {titleLabel}
      </button>
      <button type="button" role="tab" aria-selected={view === "refs"} onClick={() => setView("refs")} className={cls(view === "refs")}>
        参考上位 {refCount}件
      </button>
    </div>
  );
}

export function IssueList({ issues }: { issues: { index: number | null; message: string }[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {issues.map((issue, i) => (
        <li key={i}>{issue.index !== null ? `${issue.index + 1}番目：` : ""}{issue.message}</li>
      ))}
    </ul>
  );
}
