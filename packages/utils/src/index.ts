type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[AI Writing Assistant]";

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    log("debug", message, args);
  },
  info(message: string, ...args: unknown[]): void {
    log("info", message, args);
  },
  warn(message: string, ...args: unknown[]): void {
    log("warn", message, args);
  },
  error(message: string, ...args: unknown[]): void {
    log("error", message, args);
  },
};

function log(level: LogLevel, message: string, args: unknown[]): void {
  const formatted = `${LOG_PREFIX} ${message}`;
  switch (level) {
    case "debug":
      console.debug(formatted, ...args);
      break;
    case "info":
      console.info(formatted, ...args);
      break;
    case "warn":
      console.warn(formatted, ...args);
      break;
    case "error":
      console.error(formatted, ...args);
      break;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/** Debounces a function call (Module 14). */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), waitMs);
  };
}

/** Returns Tailwind color class for a rating badge. */
export function getRatingColorClass(rating: "good" | "needs-improvement" | "poor"): string {
  switch (rating) {
    case "good":
      return "text-green-600";
    case "needs-improvement":
      return "text-amber-600";
    case "poor":
      return "text-red-600";
  }
}

export function hostnameMatches(hostname: string, pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) return false;
  const host = hostname.toLowerCase();
  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === normalized || host.endsWith(`.${normalized}`);
}
