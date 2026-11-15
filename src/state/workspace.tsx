"use client";

// 作業中の状態（同じページを開いている間だけ保持する一時状態）
// ページの再読み込み・終了で初期状態に戻る。永続保存はしない。

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { STEPS, type Mode, type StepStatus } from "@/lib/steps";

export type Keywords = {
  main: string | null;
  sub: string[];
};

type ModeState = {
  /** 最後に開いていた工程（0始まり） */
  currentStep: number;
  /** 各工程の状態。完了・再確認の判定は後の段階で設定する */
  stepStatus: StepStatus[];
  keywords: Keywords;
};

export type WorkspaceState = {
  mode: Mode;
  modes: Record<Mode, ModeState>;
  /** AI処理・URL取得中の段階名。null なら処理していない */
  processing: string | null;
  historyOpen: boolean;
};

export type WorkspaceAction =
  | { type: "switchMode"; mode: Mode }
  | { type: "goToStep"; step: number }
  | { type: "openHistory" }
  | { type: "closeHistory" }
  | { type: "startProcessing"; label: string }
  | { type: "endProcessing" };

function initialModeState(mode: Mode): ModeState {
  return {
    currentStep: 0,
    stepStatus: STEPS[mode].map(() => "todo"),
    keywords: { main: null, sub: [] },
  };
}

// 初回表示・再読み込み後は「新規作成の①キーワード」
export const initialWorkspaceState: WorkspaceState = {
  mode: "new",
  modes: {
    new: initialModeState("new"),
    rewrite: initialModeState("rewrite"),
  },
  processing: null,
  historyOpen: false,
};

function reducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "switchMode":
      // 処理中はモード変更を許可しない
      if (state.processing || action.mode === state.mode) return state;
      return { ...state, mode: action.mode };

    case "goToStep": {
      // 処理中は工程移動を許可しない
      if (state.processing) return state;
      const count = STEPS[state.mode].length;
      if (action.step < 0 || action.step >= count) return state;
      const current = state.modes[state.mode];
      return {
        ...state,
        modes: {
          ...state.modes,
          [state.mode]: { ...current, currentStep: action.step },
        },
      };
    }

    case "openHistory":
      if (state.processing) return state;
      return { ...state, historyOpen: true };

    case "closeHistory":
      return { ...state, historyOpen: false };

    case "startProcessing":
      return { ...state, processing: action.label };

    case "endProcessing":
      return { ...state, processing: null };
  }
}

const StateContext = createContext<WorkspaceState | null>(null);
const DispatchContext = createContext<Dispatch<WorkspaceAction> | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialWorkspaceState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useWorkspace(): WorkspaceState {
  const value = useContext(StateContext);
  if (!value) throw new Error("WorkspaceProvider の中で使ってください");
  return value;
}

export function useWorkspaceDispatch(): Dispatch<WorkspaceAction> {
  const value = useContext(DispatchContext);
  if (!value) throw new Error("WorkspaceProvider の中で使ってください");
  return value;
}

/** 現在のモードの状態をまとめて取り出す */
export function useCurrentMode() {
  const state = useWorkspace();
  const modeState = state.modes[state.mode];
  const steps = STEPS[state.mode];
  return {
    mode: state.mode,
    steps,
    stepIndex: modeState.currentStep,
    step: steps[modeState.currentStep],
    stepStatus: modeState.stepStatus,
    keywords: modeState.keywords,
    locked: state.processing !== null,
  };
}
