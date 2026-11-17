// 回数の記録場所（サーバー専用）
// ・Upstash Redis の接続情報があれば、Upstash に記録する（Vercel ではこれが必要）
// ・接続情報がなく、自分のPCで開発しているときは、サーバーのメモリに記録する（再起動で消える）
// ・Vercel 上で接続情報がない場合は、利用制限を守れないので処理を止める

import { Redis } from "@upstash/redis";

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

class UpstashStore implements KeyValueStore {
  // 値は自分で JSON にして保存しているので、自動の変換は使わない
  constructor(private redis: Redis) {}

  async get(key: string) {
    const value = await this.redis.get<string>(PREFIX + key);
    return value ?? null;
  }

  async set(key: string, value: string, ttlSec: number) {
    await this.redis.set(PREFIX + key, value, { ex: Math.max(1, Math.ceil(ttlSec)) });
  }

  async del(key: string) {
    await this.redis.del(PREFIX + key);
  }
}

/** 同じ Redis を他の用途と共有しても混ざらないよう、名前の前に付ける */
const PREFIX = "title-studio:";

export class StoreNotConfiguredError extends Error {}

/** Upstash の接続情報（Vercel の連携で設定される名前と、Upstash 標準の名前の両方に対応） */
function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

// 開発中のホットリロードで記録が消えないよう、globalThis に1つだけ持つ
const globalForStore = globalThis as unknown as { __titleStudioStore?: KeyValueStore };

export function getStore(): KeyValueStore {
  if (globalForStore.__titleStudioStore) return globalForStore.__titleStudioStore;

  const upstash = upstashConfig();
  if (upstash) {
    globalForStore.__titleStudioStore = new UpstashStore(
      new Redis({ url: upstash.url, token: upstash.token, automaticDeserialization: false }),
    );
  } else if (process.env.VERCEL === "1") {
    throw new StoreNotConfiguredError("外部の保存先（Upstash Redis）が設定されていません。");
  } else {
    globalForStore.__titleStudioStore = new MemoryStore();
  }
  return globalForStore.__titleStudioStore;
}
