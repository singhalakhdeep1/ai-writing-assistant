import { createDefaultStore, type KeyValueStore } from "./store";

export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

export interface LogContext {
  correlationId: string;
  requestId?: string;
  tabId?: number;
  hostname?: string;
  provider?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
  error?: string;
}

export interface StructuredLoggingOptions {
  source?: string;
  /** Recent entries kept for the Options page diagnostics view (0 disables persistence). */
  bufferSize?: number;
  /** Lowest level written to the console. */
  consoleLevel?: Exclude<LogLevel, "audit">;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, audit: 1 };
const BUFFER_KEY = "awa:logs";

/** JSON log lines with correlation ids, audit events and a small persisted ring buffer. */
export class StructuredLoggingService {
  private readonly source: string;
  private readonly bufferSize: number;
  private readonly consoleLevel: Exclude<LogLevel, "audit">;
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: KeyValueStore = createDefaultStore(),
    options: StructuredLoggingOptions = {},
  ) {
    this.source = options.source ?? "awa";
    this.bufferSize = options.bufferSize ?? 100;
    this.consoleLevel = options.consoleLevel ?? "info";
  }

  static createCorrelationId(): string {
    return crypto.randomUUID();
  }

  /** Returns a logger bound to one request so every line carries the same correlation id. */
  withContext(context: Partial<LogContext>) {
    const bound: LogContext = {
      correlationId: context.correlationId ?? StructuredLoggingService.createCorrelationId(),
      ...context,
    };
    return {
      context: bound,
      debug: (message: string, data?: Record<string, unknown>) =>
        this.write("debug", message, bound, data),
      info: (message: string, data?: Record<string, unknown>) =>
        this.write("info", message, bound, data),
      warn: (message: string, data?: Record<string, unknown>) =>
        this.write("warn", message, bound, data),
      error: (message: string, error: unknown, data?: Record<string, unknown>) =>
        this.write("error", message, bound, data, error),
      audit: (eventType: string, description: string, data?: Record<string, unknown>) =>
        this.write("audit", description, bound, { ...data, eventType }),
    };
  }

  logInformation(message: string, data?: Record<string, unknown>): LogEntry {
    return this.write("info", message, this.defaultContext(), data);
  }

  logWarning(message: string, data?: Record<string, unknown>): LogEntry {
    return this.write("warn", message, this.defaultContext(), data);
  }

  logError(message: string, error: unknown, data?: Record<string, unknown>): LogEntry {
    return this.write("error", message, this.defaultContext(), data, error);
  }

  logAuditEvent(eventType: string, description: string, data?: Record<string, unknown>): LogEntry {
    return this.write("audit", description, this.defaultContext(), { ...data, eventType });
  }

  async getRecentEntries(limit = this.bufferSize): Promise<LogEntry[]> {
    await this.pending;
    const entries = (await this.store.get<LogEntry[]>(BUFFER_KEY)) ?? [];
    return entries.slice(-limit).reverse();
  }

  async clear(): Promise<void> {
    await this.pending;
    await this.store.remove([BUFFER_KEY]);
  }

  private write(
    level: LogLevel,
    message: string,
    context: LogContext,
    data?: Record<string, unknown>,
    error?: unknown,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...(data && Object.keys(data).length ? { data } : {}),
      ...(error !== undefined
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    };
    if (LEVEL_ORDER[level] >= LEVEL_ORDER[this.consoleLevel]) {
      const line = JSON.stringify({ source: this.source, ...entry });
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.info(line);
    }
    if (this.bufferSize > 0 && level !== "debug") this.append(entry);
    return entry;
  }

  private append(entry: LogEntry): void {
    this.pending = this.pending
      .then(async () => {
        const entries = (await this.store.get<LogEntry[]>(BUFFER_KEY)) ?? [];
        entries.push(entry);
        await this.store.set(BUFFER_KEY, entries.slice(-this.bufferSize));
      })
      .catch(() => undefined);
  }

  private defaultContext(): LogContext {
    return { correlationId: StructuredLoggingService.createCorrelationId() };
  }
}
