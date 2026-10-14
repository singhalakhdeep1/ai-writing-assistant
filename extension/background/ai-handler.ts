import { getAvailableProvider, getProvider } from "@awa/ai-providers";
import { buildPromptWithContext } from "@awa/prompts";
import { createMessage } from "@awa/messaging";
import { abortStream, completeStream, createStreamRequest } from "@awa/streaming";
import { recordSuggestionShown } from "@awa/analytics";
import { diffSentences, getChangedSentences } from "@awa/diff";
import type { AIRequest, AIStreamChunk, ExtensionMessage, WritingAction } from "@awa/types";
import { hashKey } from "@awa/services";
import { generateId } from "@awa/utils";
import {
  getPerformanceSettings,
  getRateLimiter,
  logging,
  rateLimitKey,
  responseCache,
} from "./infrastructure";
import { filterPersonalDictionary, getPrivacySettings, isSiteAllowed } from "./privacy";

type RequestLog = ReturnType<typeof logging.withContext>;

interface TabState {
  selection: { text: string; fieldId: string } | null;
  hostname: string;
}

const tabState = new Map<number, TabState>();

export function updateTabSelection(
  tabId: number,
  selection: { text: string; fieldId: string } | null,
  hostname: string,
): void {
  tabState.set(tabId, { selection, hostname });
}

export function getTabSelection(tabId: number): TabState | undefined {
  return tabState.get(tabId);
}

function broadcastStreamChunk(chunk: AIStreamChunk): void {
  void chrome.runtime.sendMessage(createMessage("AI_STREAM_CHUNK", chunk)).catch(() => undefined);
}

function broadcastStreamDone(
  requestId: string,
  action: WritingAction,
  fullText: string,
  original: string,
  tabId?: number,
): void {
  const diffs = diffSentences(original, fullText);
  const changed = getChangedSentences(original, fullText);
  const message = createMessage("AI_STREAM_DONE", {
    requestId,
    action,
    original,
    fullText,
    diffs,
    changed,
  });
  // runtime.sendMessage reaches extension pages (side panel, popup) but not content scripts,
  // so the page that asked also gets it directly for its sentence highlights.
  void chrome.runtime.sendMessage(message).catch(() => undefined);
  if (tabId !== undefined) void chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
}

function broadcastStreamError(requestId: string, action: WritingAction, error: string): void {
  void chrome.runtime
    .sendMessage(createMessage("AI_STREAM_ERROR", { requestId, action, error }))
    .catch(() => undefined);
}

/** Handles AI requests with streaming and AbortController (Modules 4–6). */
export async function handleAIRequest(
  message: ExtensionMessage<AIRequest>,
  sender: chrome.runtime.MessageSender,
): Promise<{ success: boolean; data?: { requestId: string }; error?: string }> {
  const tabId = sender.tab?.id;
  const payload = message.payload;
  if (!payload) return { success: false, error: "Missing AI request payload" };

  const hostname =
    payload.hostname ?? (tabId ? tabState.get(tabId)?.hostname : undefined) ?? "unknown";

  if (!(await isSiteAllowed(hostname))) {
    return { success: false, error: "Site is blocked by privacy settings" };
  }

  const privacy = await getPrivacySettings();
  let text = payload.text;

  if (!text && tabId) {
    text = tabState.get(tabId)?.selection?.text ?? "";
  }

  if (!text.trim()) {
    return { success: false, error: "No text selected" };
  }

  text = filterPersonalDictionary(text, privacy.personalDictionary);

  const request: AIRequest = {
    ...payload,
    text,
    hostname,
    requestId: payload.requestId ?? generateId(),
  };

  let provider;
  if (privacy.onDeviceOnly) {
    const nano = getProvider("gemini-nano");
    provider = nano && (await nano.isAvailable()) ? nano : null;
  } else {
    provider = await getAvailableProvider(request.provider);
  }

  if (!provider) {
    return {
      success: false,
      error: privacy.onDeviceOnly
        ? "On-device AI unavailable. Disable on-device mode or configure a cloud provider."
        : "No AI provider configured. Add an API key in Settings.",
    };
  }

  const streamRequest = createStreamRequest();
  const requestId = streamRequest.id;
  request.requestId = requestId;

  const log = logging.withContext({
    correlationId: requestId,
    tabId,
    hostname,
    provider: provider.id,
  });
  log.audit("ai.request", `AI ${request.action} requested`, { chars: text.length });

  const performance = await getPerformanceSettings();
  const cacheKey = performance.cacheEnabled
    ? await hashKey(provider.id, request.action, request.customPrompt, hostname, text)
    : null;
  const cached = cacheKey ? await responseCache.get<string>(cacheKey) : null;

  if (cached !== null) {
    log.audit("ai.cache_hit", "Answer served from the response cache");
    completeStream(requestId);
    // Let the caller receive the requestId before the result is broadcast.
    setTimeout(() => {
      broadcastStreamChunk({ requestId, action: request.action, content: cached, done: false });
      broadcastStreamChunk({ requestId, action: request.action, content: "", done: true });
      broadcastStreamDone(requestId, request.action, cached, text, tabId);
    }, 0);
  } else {
    // On-device inference costs nothing and has no quota; only cloud calls are rate limited.
    if (provider.id !== "gemini-nano") {
      const limit = await getRateLimiter(performance.requestsPerMinute).consume(
        rateLimitKey(provider.id),
      );
      if (!limit.allowed) {
        completeStream(requestId);
        const waitSeconds = Math.ceil(limit.retryAfterMs / 1000);
        log.audit("ai.rate_limited", `${provider.name} rate limit reached`, { waitSeconds });
        return {
          success: false,
          error: `Rate limit reached for ${provider.name} (${performance.requestsPerMinute} requests/minute). Try again in ${waitSeconds}s or raise the limit in Settings → Performance.`,
        };
      }
    }
    void processAIStream(
      requestId,
      request,
      provider.id,
      streamRequest.controller.signal,
      text,
      log,
      {
        cacheKey,
        ttlSeconds: performance.cacheTtlMinutes * 60,
      },
    );
  }

  if (request.action !== "explain") void recordSuggestionShown();

  // Explanations are requested from inside the side panel, which is already open.
  if (tabId && chrome.sidePanel?.open && request.action !== "explain") {
    chrome.sidePanel.open({ tabId }).catch(() => {
      // Opening needs a user gesture; the panel can still be opened from the popup.
    });
  }

  return { success: true, data: { requestId } };
}

async function processAIStream(
  requestId: string,
  request: AIRequest,
  providerId: string,
  signal: AbortSignal,
  originalText: string,
  log: RequestLog,
  cache: { cacheKey: string | null; ttlSeconds: number; tabId?: number },
): Promise<void> {
  const provider = await getAvailableProvider(providerId as AIRequest["provider"]);
  if (!provider) {
    broadcastStreamError(requestId, request.action, "Provider unavailable");
    log.warn("Provider became unavailable before streaming");
    return;
  }

  const { context } = buildPromptWithContext(
    request.action,
    request.text,
    request.hostname ?? "unknown",
  );
  const startedAt = Date.now();
  log.info("AI stream started", { model: provider.name, context });

  let fullText = "";

  try {
    for await (const chunk of provider.stream(request, signal)) {
      if (signal.aborted) break;
      fullText += chunk;
      broadcastStreamChunk({ requestId, action: request.action, content: chunk, done: false });
    }

    if (signal.aborted) {
      log.audit("ai.aborted", "Stream cancelled by the user", { chars: fullText.length });
    } else {
      const answer = fullText.trim();
      broadcastStreamChunk({ requestId, action: request.action, content: "", done: true });
      broadcastStreamDone(requestId, request.action, answer, originalText, cache.tabId);
      if (cache.cacheKey && answer)
        await responseCache.set(cache.cacheKey, answer, cache.ttlSeconds);
      log.audit("ai.completed", "AI stream completed", {
        chars: answer.length,
        durationMs: Date.now() - startedAt,
      });
    }
  } catch (error) {
    if (!signal.aborted) {
      const msg = error instanceof Error ? error.message : "Stream failed";
      broadcastStreamError(requestId, request.action, msg);
      log.error("AI stream failed", error, { durationMs: Date.now() - startedAt });
    }
  } finally {
    completeStream(requestId);
  }
}

export function handleAIAbort(message: ExtensionMessage<{ requestId: string }>): {
  success: boolean;
} {
  const requestId = message.payload?.requestId;
  if (!requestId) return { success: false };
  abortStream(requestId);
  return { success: true };
}
