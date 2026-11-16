"use client";

import { useWorkspace, useWorkspaceDispatch, type Keywords } from "@/state/workspace";
import type { NewDraft } from "@/state/newDraft";

/** 新規作成の作業データと、更新するための関数 */
export function useNewDraft() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  return {
    draft: state.newDraft,
    keywords: state.modes.new.keywords,
    locked: state.processing !== null,
    update: (update: (draft: NewDraft) => NewDraft) => dispatch({ type: "updateNew", update }),
    setKeywords: (keywords: Keywords) => dispatch({ type: "setKeywords", mode: "new", keywords }),
    goToStep: (step: number) => dispatch({ type: "goToStep", step }),
  };
}
