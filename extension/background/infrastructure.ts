import {
  CacheService,
  RateLimitingService,
  StructuredLoggingService,
  createDefaultStore,
} from "@awa/services";
import {
  DEFAULT_PERFORMANCE,
  type AIProvider,
  type AppSettings,
  type DiagnosticsSnapshot,
  type PerformanceSettings,
} from "@awa/types";

const SETTINGS_KEY = "awa:settings";
const CLOUD_PROVIDERS: AIProvider[] = ["openai", "gemini", "anthropic"];

const store = createDefaultStore();

/** Completed AI answers keyed by a hash of provider, action, prompt and text. */
export const responseCache = new CacheService(store, {
  namespace: "ai-responses",
  defaultTtlSeconds: DEFAULT_PERFORMANCE.cacheTtlMinutes * 60,
  maxEntries: 200,
});

export const logging = new StructuredLoggingService(store, {
  source: "background",
  bufferSize: 150,
});

const limiters = new Map<number, RateLimitingService>();

/** One limiter per configured rate, so a settings change takes effect immediately. */
export function getRateLimiter(requestsPerMinute: number): RateLimitingService {
  let limiter = limiters.get(requestsPerMinute);
  if (!limiter) {
    limiter = new RateLimitingService(store, {
      capacity: requestsPerMinute,
      refillPerSecond: requestsPerMinute / 60,
    });
    limiters.set(requestsPerMinute, limiter);
  }
  return limiter;
}

export function rateLimitKey(provider: AIProvider): string {
  return `provider:${provider}`;
}

export async function getPerformanceSettings(): Promise<PerformanceSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const saved = (result[SETTINGS_KEY] as Partial<AppSettings> | undefined)?.performance;
  return { ...DEFAULT_PERFORMANCE, ...saved };
}

export async function getDiagnostics(): Promise<DiagnosticsSnapshot> {
  const performance = await getPerformanceSettings();
  const limiter = getRateLimiter(performance.requestsPerMinute);
  const [cache, logs, ...remaining] = await Promise.all([
    responseCache.stats(),
    logging.getRecentEntries(50),
    ...CLOUD_PROVIDERS.map((p) => limiter.getRemainingTokens(rateLimitKey(p))),
  ]);
  return {
    cache,
    rateLimits: CLOUD_PROVIDERS.map((provider, i) => ({
      provider,
      remaining: remaining[i] as number,
      capacity: performance.requestsPerMinute,
    })),
    logs: (logs as Awaited<ReturnType<typeof logging.getRecentEntries>>).map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
      correlationId: e.context.correlationId,
      data: e.data,
      error: e.error,
    })),
  };
}
