import { createMessage, onMessage } from "@awa/messaging";
import { getAnalytics, getAcceptanceRate } from "@awa/analytics";
import type { AppSettings, ExtensionMessage, TabInfo, WritingAction } from "@awa/types";
import { logger } from "@awa/utils";
import { DEFAULT_PERFORMANCE } from "@awa/types";
import { handleAIAbort, handleAIRequest, getTabSelection, updateTabSelection } from "./ai-handler";
import { getDiagnostics, getPerformanceSettings, logging, responseCache } from "./infrastructure";
import { getPrivacySettings, savePrivacySettings } from "./privacy";

const SETTINGS_KEY = "awa:settings";

logger.info("Background service worker initialized");

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension ${details.reason}`, {
    version: chrome.runtime.getManifest().version,
  });

  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }

  const existing = await chrome.storage.local.get([SETTINGS_KEY, "awa:privacy"]);
  if (!existing["awa:privacy"]) {
    await chrome.storage.local.set({
      "awa:privacy": {
        onDeviceOnly: false,
        allowedSites: [],
        blockedSites: [],
        personalDictionary: [],
      },
    });
  }
  if (!existing[SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        preferredProvider: "openai",
        providerKeys: {},
        performance: DEFAULT_PERFORMANCE,
      },
    });
  }
  logging.logAuditEvent("extension.lifecycle", `Extension ${details.reason}`, {
    version: chrome.runtime.getManifest().version,
  });
});

/**
 * The web page a message is about. Content scripts report their own tab; extension pages
 * (side panel, popup, or either opened in a normal tab) act on the active tab instead.
 */
async function resolveTargetTabId(
  sender: chrome.runtime.MessageSender,
): Promise<number | undefined> {
  const fromExtensionPage = (sender.url ?? "").startsWith(chrome.runtime.getURL(""));
  if (sender.tab?.id !== undefined && !fromExtensionPage) return sender.tab.id;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id;
}

const COMMAND_ACTIONS: Record<
  string,
  { type: "RUN_ACTION" | "UNDO_SUGGESTION"; action?: WritingAction }
> = {
  "fix-grammar": { type: "RUN_ACTION", action: "grammar" },
  "rewrite-selection": { type: "RUN_ACTION", action: "rewrite" },
  "undo-suggestion": { type: "UNDO_SUGGESTION" },
};

chrome.commands.onCommand.addListener(async (command) => {
  const mapped = COMMAND_ACTIONS[command];
  if (!mapped) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(
      tab.id,
      createMessage(mapped.type, mapped.action ? { action: mapped.action } : undefined),
    );
  } catch (error) {
    // Content scripts are not injected on chrome:// pages or before the page finished loading.
    logger.debug("Command not delivered", { command, error: String(error) });
  }
});

onMessage({
  PING: () => ({ success: true, data: "PONG" }),

  GET_TAB_INFO: async (_message, sender) => {
    try {
      const tabId = await resolveTargetTabId(sender);
      if (tabId === undefined) return { success: false, error: "No active tab found" };
      const tab = await chrome.tabs.get(tabId);
      const tabInfo: TabInfo = { tabId, url: tab.url ?? "", title: tab.title ?? "" };
      return { success: true, data: tabInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get tab info",
      };
    }
  },

  EXTENSION_READY: (_message, sender) => {
    logger.info("Content script ready", { tabId: sender.tab?.id });
    return { success: true, data: { ready: true } };
  },

  EDITOR_DETECTED: (_message, sender) => {
    logger.debug("Editors detected", {
      tabId: sender.tab?.id,
      count: (_message.payload as { fields?: unknown[] })?.fields?.length,
    });
    return { success: true };
  },

  SELECTION_CHANGED: (message, sender) => {
    const tabId = sender.tab?.id;
    if (!tabId) return { success: false };
    const payload = message.payload as {
      text: string;
      fieldId: string;
      hostname?: string;
    };
    updateTabSelection(
      tabId,
      payload.text ? { text: payload.text, fieldId: payload.fieldId } : null,
      payload.hostname ?? new URL(sender.tab?.url ?? "https://unknown").hostname,
    );
    void chrome.runtime.sendMessage(createMessage("SELECTION_CHANGED", payload));
    return { success: true };
  },

  AI_REQUEST: async (message, sender) => {
    const tabId = await resolveTargetTabId(sender);
    const enriched = {
      ...message,
      payload: {
        ...(message.payload as object),
        hostname:
          (message.payload as { hostname?: string })?.hostname ??
          (tabId ? getTabSelection(tabId)?.hostname : undefined),
      },
    };
    return handleAIRequest(enriched as ExtensionMessage<import("@awa/types").AIRequest>, {
      ...sender,
      tab: tabId ? ({ id: tabId } as chrome.tabs.Tab) : sender.tab,
    });
  },

  AI_ABORT: (message) => handleAIAbort(message as ExtensionMessage<{ requestId: string }>),

  GET_SETTINGS: async () => {
    const [settingsResult, privacy, performance] = await Promise.all([
      chrome.storage.local.get(SETTINGS_KEY),
      getPrivacySettings(),
      getPerformanceSettings(),
    ]);
    const settings = (settingsResult[SETTINGS_KEY] as AppSettings) ?? {
      preferredProvider: "openai",
      providerKeys: {},
      privacy,
    };
    return { success: true, data: { ...settings, privacy, performance } };
  },

  SAVE_SETTINGS: async (message) => {
    const payload = message.payload as Partial<AppSettings>;
    const current = await chrome.storage.local.get(SETTINGS_KEY);
    const merged = { ...(current[SETTINGS_KEY] as AppSettings), ...payload };
    await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
    if (payload.privacy) await savePrivacySettings(payload.privacy);
    logging.logAuditEvent("settings.saved", "Settings saved", {
      fields: Object.keys(payload),
      preferredProvider: merged.preferredProvider,
    });
    return { success: true, data: merged };
  },

  GET_ANALYTICS: async () => {
    const snapshot = await getAnalytics();
    return {
      success: true,
      data: { ...snapshot, acceptanceRate: getAcceptanceRate(snapshot) },
    };
  },

  CLEAR_CACHE: async () => {
    const removed = await responseCache.clear();
    logging.logAuditEvent("cache.cleared", "Response cache cleared", { removed });
    return { success: true, data: { removed } };
  },

  GET_DIAGNOSTICS: async () => ({ success: true, data: await getDiagnostics() }),

  GET_SELECTION: async (_message, sender) => {
    const tabId = await resolveTargetTabId(sender);
    if (!tabId) return { success: false, error: "No tab" };
    const state = getTabSelection(tabId);
    return { success: true, data: state?.selection ?? null };
  },
});

export {};
