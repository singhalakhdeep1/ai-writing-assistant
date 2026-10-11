import { useCallback, useEffect, useState } from "react";
import { createMessage, pingBackground } from "@awa/messaging";
import type {
  AIRequest,
  AIStreamChunk,
  AnalyticsSnapshot,
  AppSettings,
  TabInfo,
  TextSelection,
  WritingAction,
} from "@awa/types";

/** Hook to verify background service worker connectivity. */
export function useExtensionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    const connected = await pingBackground();
    setIsConnected(connected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return { isConnected, isLoading, checkConnection };
}

/** Hook to fetch current active tab info from the background worker. */
export function useActiveTab() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTabInfo() {
      setIsLoading(true);
      try {
        const response = await chrome.runtime.sendMessage(createMessage("GET_TAB_INFO"));
        if (response?.success && response.data) {
          setTabInfo(response.data as TabInfo);
        }
      } catch {
        setTabInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchTabInfo();
  }, []);

  return { tabInfo, isLoading };
}

/** Hook exposing extension version from the manifest. */
export function useExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

/** Hook for AI streaming state (Module 6). */
export function useAIStream() {
  const [streamText, setStreamText] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [diffs, setDiffs] = useState<
    Array<{ original: string; modified: string; changed: boolean }>
  >([]);

  useEffect(() => {
    const listener = (message: { type: string; payload?: unknown }) => {
      if (message.type === "AI_STREAM_CHUNK") {
        const chunk = message.payload as AIStreamChunk;
        if (chunk.done) return;
        // "Explain why" streams into its own channel so it never replaces the suggestion.
        if (chunk.action === "explain") setExplanation((prev) => prev + chunk.content);
        else setStreamText((prev) => prev + chunk.content);
      }
      if (message.type === "AI_STREAM_DONE") {
        const payload = message.payload as {
          requestId: string;
          action?: WritingAction;
          original?: string;
          fullText: string;
          diffs: Array<{ original: string; modified: string; changed: boolean }>;
        };
        if (payload.action === "explain") {
          setExplanation(payload.fullText);
          setIsExplaining(false);
          return;
        }
        setStreamText(payload.fullText);
        setDiffs(payload.diffs ?? []);
        if (payload.original) setOriginalText(payload.original);
        setIsStreaming(false);
      }
      if (message.type === "AI_STREAM_ERROR") {
        const payload = message.payload as {
          requestId: string;
          action?: WritingAction;
          error: string;
        };
        setError(payload.error);
        if (payload.action === "explain") setIsExplaining(false);
        else setIsStreaming(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const startStream = useCallback(async (request: AIRequest) => {
    setStreamText("");
    setExplanation("");
    setError(null);
    setDiffs([]);
    setOriginalText(request.text);
    setIsStreaming(true);

    const response = await chrome.runtime.sendMessage(createMessage("AI_REQUEST", request));
    if (!response?.success) {
      setError(response?.error ?? "Request failed");
      setIsStreaming(false);
      return null;
    }
    const id = (response.data as { requestId: string }).requestId;
    setRequestId(id);
    return id;
  }, []);

  /** Asks the AI why `suggested` is better than `original` (streams into `explanation`). */
  const explain = useCallback(async (original: string, suggested: string) => {
    setExplanation("");
    setError(null);
    setIsExplaining(true);
    const response = await chrome.runtime.sendMessage(
      createMessage("AI_REQUEST", {
        action: "explain",
        text: `Original:\n${original}\n\nSuggested:\n${suggested}`,
      }),
    );
    if (!response?.success) {
      setError(response?.error ?? "Could not explain this change");
      setIsExplaining(false);
    }
  }, []);

  const abortStream = useCallback(async () => {
    if (!requestId) return;
    await chrome.runtime.sendMessage(createMessage("AI_ABORT", { requestId }));
    setIsStreaming(false);
  }, [requestId]);

  const reset = useCallback(() => {
    setStreamText("");
    setError(null);
    setDiffs([]);
    setRequestId(null);
    setIsStreaming(false);
    setOriginalText("");
    setExplanation("");
    setIsExplaining(false);
  }, []);

  return {
    streamText,
    requestId,
    isStreaming,
    error,
    originalText,
    diffs,
    explanation,
    isExplaining,
    startStream,
    explain,
    abortStream,
    reset,
  };
}

/** Hook for app settings (Module 11). */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await chrome.runtime.sendMessage(createMessage("GET_SETTINGS"));
    if (response?.success) setSettings(response.data as AppSettings);
    setIsLoading(false);
  }, []);

  const save = useCallback(async (partial: Partial<AppSettings>) => {
    const response = await chrome.runtime.sendMessage(createMessage("SAVE_SETTINGS", partial));
    if (response?.success) setSettings(response.data as AppSettings);
    return response?.success ?? false;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { settings, isLoading, load, save };
}

/** Hook for local analytics (Module 12). */
export function useAnalytics() {
  const [analytics, setAnalytics] = useState<
    (AnalyticsSnapshot & { acceptanceRate: number }) | null
  >(null);

  const load = useCallback(async () => {
    const response = await chrome.runtime.sendMessage(createMessage("GET_ANALYTICS"));
    if (response?.success) {
      setAnalytics(response.data as AnalyticsSnapshot & { acceptanceRate: number });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { analytics, reload: load };
}

/** Hook tracking live selection from background relay (Module 3). */
export function useSelection() {
  const [selection, setSelection] = useState<Partial<TextSelection> | null>(null);

  useEffect(() => {
    const listener = (message: { type: string; payload?: unknown }) => {
      if (message.type === "SELECTION_CHANGED") {
        setSelection(message.payload as Partial<TextSelection> | null);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return { selection };
}

/** Sends a writing action to the AI engine. */
export async function sendWritingAction(
  action: WritingAction,
  text: string,
  hostname?: string,
): Promise<{ requestId: string } | null> {
  const response = await chrome.runtime.sendMessage(
    createMessage("AI_REQUEST", { action, text, hostname }),
  );
  if (!response?.success) return null;
  return response.data as { requestId: string };
}

/** Opens the side panel for the active tab. */
export async function openSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
}

/** Applies an accepted suggestion via content script. */
export async function applySuggestion(
  tabId: number,
  payload: { fieldId: string; original: string; modified: string; requestId: string },
): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(
      tabId,
      createMessage("APPLY_SUGGESTION", payload),
    );
    return response?.success ?? false;
  } catch {
    return false;
  }
}
