import { getAvailableProvider, getProvider } from "@awa/ai-providers";
import { buildPromptWithContext } from "@awa/prompts";
import { createMessage } from "@awa/messaging";
import { abortStream, completeStream, createStreamRequest } from "@awa/streaming";
import { recordSuggestionShown } from "@awa/analytics";
import { diffSentences, getChangedSentences } from "@awa/diff";
import type { AIRequest, AIStreamChunk, ExtensionMessage, WritingAction } from "@awa/types";
import { generateId, logger } from "@awa/utils";
import { filterPersonalDictionary, getPrivacySettings, isSiteAllowed } from "./privacy";

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
  void chrome.runtime.sendMessage(createMessage("AI_STREAM_CHUNK", chunk));
}

function broadcastStreamDone(
  requestId: string,
  action: WritingAction,
  fullText: string,
  original: string,
): void {
  const diffs = diffSentences(original, fullText);
  const changed = getChangedSentences(original, fullText);
  void chrome.runtime.sendMessage(
    createMessage("AI_STREAM_DONE", { requestId, action, original, fullText, diffs, changed }),
  );
}

function broadcastStreamError(requestId: string, action: WritingAction, error: string): void {
  void chrome.runtime.sendMessage(createMessage("AI_STREAM_ERROR", { requestId, action, error }));
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

  void processAIStream(requestId, request, provider.id, streamRequest.controller.signal, text);
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
): Promise<void> {
  const provider = await getAvailableProvider(providerId as AIRequest["provider"]);
  if (!provider) {
    broadcastStreamError(requestId, request.action, "Provider unavailable");
    return;
  }

  const { context } = buildPromptWithContext(
    request.action,
    request.text,
    request.hostname ?? "unknown",
  );
  logger.info(`AI stream started`, { requestId, provider: provider.name, context });

  let fullText = "";

  try {
    for await (const chunk of provider.stream(request, signal)) {
      if (signal.aborted) break;
      fullText += chunk;
      broadcastStreamChunk({ requestId, action: request.action, content: chunk, done: false });
    }

    if (!signal.aborted) {
      broadcastStreamChunk({ requestId, action: request.action, content: "", done: true });
      broadcastStreamDone(requestId, request.action, fullText.trim(), originalText);
    }
  } catch (error) {
    if (!signal.aborted) {
      const msg = error instanceof Error ? error.message : "Stream failed";
      broadcastStreamError(requestId, request.action, msg);
      logger.error("AI stream error", { requestId, error: msg });
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
