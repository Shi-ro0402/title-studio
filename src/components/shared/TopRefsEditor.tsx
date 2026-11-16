"use client";

// 検索上位の登録欄と、傾向タグの表示（新規③・リライト④共通）

import { useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { StaleNotice } from "@/components/ui/StaleNotice";
import { LIMITS } from "@/lib/limits";
import type { Errors } from "@/lib/validation";
import { newId, nowLocalString, type TopRef, type TrendCategory } from "@/state/newDraft";

type TopRefsEditorProps = {
  refs: TopRef[];
  onChange: (update: (refs: TopRef[]) => TopRef[]) => void;
  mainKeyword: string | null;
  errors: Errors;
  showErrors: boolean;
  locked: boolean;
  /** 0件のときの案内 */
  emptyMessage: string;
};

export function TopRefsEditor({ refs, onChange, mainKeyword, errors, showErrors, locked, emptyMessage }: TopRefsEditorProps) {
  const add = () =>
    onChange((list) => [
      ...list,
      { id: newId(), rank: String(list.length + 1), title: "", url: "", checkedAt: nowLocalString() },
    ]);
  const edit = (id: string, patch: Partial<TopRef>) =>
    onChange((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange((list) => list.filter((r) => r.id !== id));

  const googleUrl = mainKeyword ? `https://www.google.com/search?q=${encodeURIComponent(mainKeyword)}` : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-800">Googleで検索して、上位のタイトルを手入力</p>
        {googleUrl ? (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
          >
            「{mainKeyword}」をGoogleで検索 ↗
          </a>
        ) : (
          <p className="text-sm text-slate-600">主キーワードを設定すると、検索リンクが表示されます。</p>
        )}
        <p className="text-xs text-slate-500">
          広告・AIによる概要・地図などの検索枠は除き、自然検索の結果だけを登録してください。自動取得はしません。
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">
          利用者が登録した検索上位{" "}
          <span className="text-sm font-normal text-slate-500">
            {refs.length}／最大{LIMITS.topRefs}件（任意）
          </span>
        </h2>
        <button
          type="button"
          onClick={add}
          disabled={locked || refs.length >= LIMITS.topRefs}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ＋ 上位タイトルを追加
        </button>
      </div>

      {refs.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {refs.map((r, index) => {
            const err = (key: string) => (showErrors ? errors[`ref.${r.id}.${key}`] : undefined);
            const prefix = `ref-${r.id}`;
            return (
              <li key={r.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">登録 {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={locked}
                    className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-[5rem_1fr]">
                  <LabeledInput id={`${prefix}-rank`} label="順位" value={r.rank} error={err("rank")} locked={locked}
                    inputMode="numeric" onChange={(v) => edit(r.id, { rank: v })} />
                  <LabeledInput id={`${prefix}-title`} label="表示タイトル" value={r.title} error={err("title")} locked={locked}
                    onChange={(v) => edit(r.id, { title: v })} />
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
                  <LabeledInput id={`${prefix}-url`} label="URL" type="url" placeholder="https://" value={r.url} error={err("url")}
                    locked={locked} onChange={(v) => edit(r.id, { url: v })} />
                  <LabeledInput id={`${prefix}-checked`} label="確認日時" type="datetime-local" value={r.checkedAt}
                    error={err("checkedAt")} locked={locked} onChange={(v) => edit(r.id, { checkedAt: v })} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LabeledInput({
  id, label, value, error, locked, onChange, type = "text", placeholder, inputMode,
}: {
  id: string; label: string; value: string; error?: string; locked: boolean;
  onChange: (value: string) => void; type?: string; placeholder?: string; inputMode?: "numeric";
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-slate-600">{label}</label>
      <input id={id} type={type} inputMode={inputMode} placeholder={placeholder} className={inputClass} value={value}
        disabled={locked} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

/** 「タイトルから推定した傾向」のタグ。押すと根拠となる参考タイトルを表示する */
export function TrendTags({ trend, refs }: { trend: TrendCategory[]; refs: TopRef[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const category = trend.find((c) => c.name === selected) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-slate-800">タイトルから推定した傾向</p>
      <div className="flex flex-wrap gap-2">
        {trend.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={selected === c.name}
            onClick={() => setSelected(selected === c.name ? null : c.name)}
            className={`rounded-full border px-3 py-1 text-sm ${
              selected === c.name
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {c.name}（{c.refIds.length}）
          </button>
        ))}
      </div>
      {category && (
        <ul className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-sm">
          {category.refIds.map((id) => {
            const ref = refs.find((r) => r.id === id);
            if (!ref) return null;
            return (
              <li key={id}>
                <span className="mr-2 text-slate-500">{ref.rank}位</span>
                {ref.title}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        参考記事の本文は確認していません。カテゴリをそのまま採用せず、自分の記事内容との一致を優先してください。
      </p>
    </div>
  );
}

/** 参考上位の一覧（生成結果の切り替え表示用） */
export function RefList({ refs }: { refs: TopRef[] }) {
  if (refs.length === 0) {
    return <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-600">参考上位は登録されていません（参考比較を省略）。</p>;
  }
  return (
    <ul className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-sm">
      <li className="text-xs text-slate-500">利用者が登録した検索上位</li>
      {refs.map((r) => (
        <li key={r.id}>
          <span className="mr-2 text-slate-500">{r.rank}位</span>
          {r.title}
        </li>
      ))}
    </ul>
  );
}

// ---- 古い参考情報の扱い（主キーワード変更後） ----

type RefsHolder = { topRefs: TopRef[]; basis: { refsKeyword?: string } };

/** 上位登録を変更する。最初の1件を登録したときの主キーワードを記録する */
export function changeRefs<D extends RefsHolder>(d: D, fn: (refs: TopRef[]) => TopRef[], mainKeyword: string | null): D {
  const refs = fn(d.topRefs);
  let refsKeyword = d.basis.refsKeyword;
  if (refs.length === 0) refsKeyword = undefined;
  else if (d.topRefs.length === 0 || refsKeyword === undefined) refsKeyword = mainKeyword ?? "";
  return { ...d, topRefs: refs, basis: { ...d.basis, refsKeyword } };
}

/** 新しい主キーワードで上位を確認し直し、同じ参考を使えると判断したとき。確認日時も更新する */
export function confirmRefs<D extends RefsHolder>(d: D, mainKeyword: string | null): D {
  const now = nowLocalString();
  return {
    ...d,
    topRefs: d.topRefs.map((r) => ({ ...r, checkedAt: now })),
    basis: { ...d.basis, refsKeyword: mainKeyword ?? "" },
  };
}

export function StaleRefsNotice({
  registeredKeyword, onConfirm, onReset,
}: { registeredKeyword: string; onConfirm: () => void; onReset: () => void }) {
  return (
    <StaleNotice
      title="上位情報は変更前の条件です"
      message={`登録時の主キーワードは「${registeredKeyword || "未設定"}」です（未更新）。新しい主キーワードでGoogleを確認し、同じ参考を使える場合だけ「確認済みにする」を押してください。確認日時は今の時刻に更新されます。`}
      actions={[
        { label: "確認済みにする", onClick: onConfirm },
        { label: "登録し直す（すべて削除）", onClick: onReset },
      ]}
    />
  );
}
