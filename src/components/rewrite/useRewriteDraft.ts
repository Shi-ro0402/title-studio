"use client";

import { useWorkspace, useWorkspaceDispatch } from "@/state/workspace";
import type { RewriteDraft } from "@/state/rewriteDraft";

/** タイトルリライトの作業データと、更新するための関数 */
export function useRewriteDraft() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  return {
    draft: state.rewriteDraft,
    keywords: state.modes.rewrite.keywords,
    locked: state.processing !== null,
    update: (update: (draft: RewriteDraft) => RewriteDraft) => dispatch({ type: "updateRewrite", update }),
    goToStep: (step: number) => dispatch({ type: "goToStep", step }),
  };
}
