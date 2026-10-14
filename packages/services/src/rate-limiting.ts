import { createDefaultStore, type KeyValueStore } from "./store";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitOptions {
  /** Maximum burst size. */
  capacity?: number;
  /** Tokens added per second. */
  refillPerSecond?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** When not allowed: milliseconds until enough tokens are available. */
  retryAfterMs: number;
}

/** Token-bucket rate limiter, one bucket per key (HLD: API rate limiting). */
export class RateLimitingService {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  /** Serializes read-modify-write per key; service-worker handlers interleave at every await. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly store: KeyValueStore = createDefaultStore(),
    options: RateLimitOptions = {},
  ) {
    this.capacity = options.capacity ?? 20;
    this.refillPerSecond = options.refillPerSecond ?? 20 / 60;
  }

  async consume(key: string, tokensRequested = 1): Promise<RateLimitResult> {
    return this.withLock(key, async () => {
      const bucket = this.refill(await this.load(key));
      if (bucket.tokens >= tokensRequested) {
        bucket.tokens -= tokensRequested;
        await this.save(key, bucket);
        return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
      }
      await this.save(key, bucket);
      const missing = tokensRequested - bucket.tokens;
      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: Math.ceil((missing / this.refillPerSecond) * 1000),
      };
    });
  }

  async isAllowed(key: string, tokensRequested = 1): Promise<boolean> {
    return (await this.consume(key, tokensRequested)).allowed;
  }

  async getRemainingTokens(key: string): Promise<number> {
    return Math.floor(this.refill(await this.load(key)).tokens);
  }

  async resetBucket(key: string): Promise<void> {
    await this.store.remove([this.storageKey(key)]);
  }

  private refill(bucket: TokenBucket): TokenBucket {
    const now = Date.now();
    const elapsed = Math.max(0, now - bucket.lastRefill) / 1000;
    return {
      tokens: Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSecond),
      lastRefill: now,
    };
  }

  private async load(key: string): Promise<TokenBucket> {
    return (
      (await this.store.get<TokenBucket>(this.storageKey(key))) ?? {
        tokens: this.capacity,
        lastRefill: Date.now(),
      }
    );
  }

  private async save(key: string, bucket: TokenBucket): Promise<void> {
    await this.store.set(this.storageKey(key), bucket);
  }

  private storageKey(key: string): string {
    return `awa:ratelimit:${key}`;
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    this.locks.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  }
}
