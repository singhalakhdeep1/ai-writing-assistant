import type { ProviderKeys } from "@awa/types";

const STORAGE_KEY = "awa:settings";

export interface StoredSettings {
  preferredProvider?: string;
  providerKeys?: ProviderKeys;
}

/** Reads provider API keys from chrome.storage (Module 4). */
export async function getProviderKeys(): Promise<ProviderKeys> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const settings = result[STORAGE_KEY] as StoredSettings | undefined;
  return settings?.providerKeys ?? {};
}

/** Reads the preferred AI provider from storage. */
export async function getPreferredProvider(): Promise<string | undefined> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const settings = result[STORAGE_KEY] as StoredSettings | undefined;
  return settings?.preferredProvider;
}

/** Parses Server-Sent Events from a streaming response body. */
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  extractContent: (data: Record<string, unknown>) => string | null,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          const content = extractContent(parsed);
          if (content) yield content;
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
