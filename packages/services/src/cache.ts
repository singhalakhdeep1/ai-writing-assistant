import { createDefaultStore, type KeyValueStore } from "./store";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheOptions {
  /** Key prefix so several caches can share one store. */
  namespace?: string;
  defaultTtlSeconds?: number;
  /** Oldest entries are evicted beyond this many keys. */
  maxEntries?: number;
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
}

/** TTL cache with get/set/delete, get-or-set and pattern invalidation (HLD: distributed caching). */
export class CacheService {
  private readonly prefix: string;
  private readonly defaultTtl: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly store: KeyValueStore = createDefaultStore(),
    options: CacheOptions = {},
  ) {
    this.prefix = `awa:cache:${options.namespace ?? "default"}:`;
    this.defaultTtl = options.defaultTtlSeconds ?? 3600;
    this.maxEntries = options.maxEntries ?? 200;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = await this.store.get<CacheEntry<T>>(this.prefix + key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) await this.store.remove([this.prefix + key]);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtl): Promise<void> {
    const now = Date.now();
    await this.store.set(this.prefix + key, {
      value,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    } satisfies CacheEntry<T>);
    await this.evictOverflow();
  }

  async delete(key: string): Promise<void> {
    await this.store.remove([this.prefix + key]);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /** Removes every key matching a glob pattern (`*` wildcard), e.g. `openai:*`. */
  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
    const keys = (await this.store.keys(this.prefix)).filter((k) =>
      regex.test(k.slice(this.prefix.length)),
    );
    await this.store.remove(keys);
    return keys.length;
  }

  async clear(): Promise<number> {
    return this.invalidatePattern("*");
  }

  async stats(): Promise<CacheStats> {
    const keys = await this.store.keys(this.prefix);
    return { entries: keys.length, hits: this.hits, misses: this.misses };
  }

  private async evictOverflow(): Promise<void> {
    const keys = await this.store.keys(this.prefix);
    if (keys.length <= this.maxEntries) return;
    const entries = await Promise.all(
      keys.map(async (k) => ({ k, e: await this.store.get<CacheEntry<unknown>>(k) })),
    );
    entries.sort((a, b) => (a.e?.createdAt ?? 0) - (b.e?.createdAt ?? 0));
    await this.store.remove(entries.slice(0, keys.length - this.maxEntries).map((x) => x.k));
  }
}

/** Stable SHA-256 hex digest, used to build cache keys from long prompts. */
export async function hashKey(...parts: Array<string | undefined>): Promise<string> {
  const bytes = new TextEncoder().encode(parts.map((p) => p ?? "").join("␟"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}
