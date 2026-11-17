// 回数の記録場所（サーバー専用）
// ・自分のPCでの開発中は、サーバーのメモリに記録する（再起動で消える）
// ・Vercel では複数のサーバーに分かれて動くため、外部の保存先（Upstash Redis）が必要。
//   公開時に Upstash をつなぐまでは、Vercel 上では利用制限を守れないので処理を止める。

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  /** ttlSec 秒後に自動で消える値を保存する */
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

type Item = { value: string; expiresAt: number };

class MemoryStore implements KeyValueStore {
  private items = new Map<string, Item>();

  async get(key: string) {
    const item = this.items.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.items.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSec: number) {
    this.items.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async del(key: string) {
    this.items.delete(key);
  }
}

export class StoreNotConfiguredError extends Error {}

// 開発中のホットリロードで記録が消えないよう、globalThis に1つだけ持つ
const globalForStore = globalThis as unknown as { __titleStudioStore?: KeyValueStore };

export function getStore(): KeyValueStore {
  if (process.env.VERCEL === "1") {
    // Upstash Redis をつなぐ段階で、ここを外部の保存先に置き換える
    throw new StoreNotConfiguredError("外部の保存先が設定されていません。");
  }
  globalForStore.__titleStudioStore ??= new MemoryStore();
  return globalForStore.__titleStudioStore;
}
