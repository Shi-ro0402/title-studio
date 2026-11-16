import { USING_SAMPLE_API } from "@/lib/api";

/** 開発用のサンプル結果であることを示す表示。Claude API 接続後は出なくなる */
export function SampleNotice() {
  if (!USING_SAMPLE_API) return null;
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="mr-2 rounded bg-amber-200 px-1.5 py-0.5 font-bold">サンプル</span>
      開発用のサンプル結果です。AIは使っておらず、入力内容とは関係のない例が含まれます。
    </p>
  );
}
