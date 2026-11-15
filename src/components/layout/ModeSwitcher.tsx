"use client";

import { MODE_LABEL, type Mode } from "@/lib/steps";
import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";
import { MODE_THEME } from "./modeTheme";

const MODES: Mode[] = ["new", "rewrite"];

export function ModeSwitcher() {
  const { mode, processing } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const locked = processing !== null;

  return (
    <div role="group" aria-label="モード切り替え" className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            disabled={locked && !active}
            onClick={() => dispatch({ type: "switchMode", mode: m })}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-bold sm:flex-none ${
              active
                ? MODE_THEME[m].modeActive
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {MODE_LABEL[m]}
          </button>
        );
      })}
      <button
        type="button"
        disabled
        className="hidden cursor-not-allowed rounded-md border border-dashed border-slate-300 bg-white px-4 py-2 text-sm text-slate-400 sm:block"
      >
        記事作成（準備中）
      </button>
    </div>
  );
}
