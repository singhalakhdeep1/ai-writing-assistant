/**
 * Key-value storage used by the cache, rate limiter and log buffer.
 *
 * The HLD calls for Redis, but an MV3 service worker cannot open TCP connections, so the
 * extension persists to `chrome.storage.local` (survives service-worker restarts) and falls
 * back to memory where `chrome.storage` is unavailable (tests, landing page).
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(keys: string[]): Promise<void>;
  /** All keys that start with `prefix`. */
  keys(prefix: string): Promise<string[]>;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) this.data.delete(key);
  }

  async keys(prefix: string): Promise<string[]> {
    return [...this.data.keys()].filter((k) => k.startsWith(prefix));
  }
}

export class ChromeStorageStore implements KeyValueStore {
  constructor(private readonly area: chrome.storage.StorageArea = chrome.storage.local) {}

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key);
    return result[key] as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.area.set({ [key]: value });
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length) await this.area.remove(keys);
  }

  async keys(prefix: string): Promise<string[]> {
    const all = await this.area.get(null);
    return Object.keys(all).filter((k) => k.startsWith(prefix));
  }
}

/** Picks chrome.storage.local inside the extension, memory everywhere else. */
export function createDefaultStore(): KeyValueStore {
  const hasChromeStorage =
    typeof chrome !== "undefined" && typeof chrome.storage?.local?.get === "function";
  return hasChromeStorage ? new ChromeStorageStore() : new MemoryStore();
}
