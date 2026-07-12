import { createMessage, onMessage } from "@awa/messaging";
import { getAnalytics, getAcceptanceRate } from "@awa/analytics";
import type { AppSettings, ExtensionMessage, PrivacySettings, TabInfo } from "@awa/types";
import { logger } from "@awa/utils";
import { handleAIAbort, handleAIRequest, getTabSelection, updateTabSelection } from "./ai-handler";
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
      },
    });
  }
});

onMessage({
  PING: () => ({ success: true, data: "PONG" }),

  GET_TAB_INFO: async (_message, sender) => {
    try {
      const tabId = sender.tab?.id;
      if (!tabId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) return { success: false, error: "No active tab found" };
        const tabInfo: TabInfo = {
          tabId: activeTab.id,
          url: activeTab.url ?? "",
          title: activeTab.title ?? "",
        };
        return { success: true, data: tabInfo };
      }
      return {
        success: true,
        data: {
          tabId,
          url: sender.tab?.url ?? "",
          title: sender.tab?.title ?? "",
        } satisfies TabInfo,
      };
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
    let tabId = sender.tab?.id;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }
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
      tab: tabId ? { id: tabId } : sender.tab,
    });
  },

  AI_ABORT: (message) => handleAIAbort(message as ExtensionMessage<{ requestId: string }>),

  GET_SETTINGS: async () => {
    const [settingsResult, privacy] = await Promise.all([
      chrome.storage.local.get(SETTINGS_KEY),
      getPrivacySettings(),
    ]);
    const settings = (settingsResult[SETTINGS_KEY] as AppSettings) ?? {
      preferredProvider: "openai",
      providerKeys: {},
      privacy,
    };
    return { success: true, data: { ...settings, privacy } };
  },

  SAVE_SETTINGS: async (message) => {
    const payload = message.payload as Partial<AppSettings>;
    const current = await chrome.storage.local.get(SETTINGS_KEY);
    const merged = { ...(current[SETTINGS_KEY] as AppSettings), ...payload };
    await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
    if (payload.privacy) await savePrivacySettings(payload.privacy);
    return { success: true, data: merged };
  },

  GET_ANALYTICS: async () => {
    const snapshot = await getAnalytics();
    return {
      success: true,
      data: { ...snapshot, acceptanceRate: getAcceptanceRate(snapshot) },
    };
  },

  GET_SELECTION: async (_message, sender) => {
    let tabId = sender.tab?.id;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }
    if (!tabId) return { success: false, error: "No tab" };
    const state = getTabSelection(tabId);
    return { success: true, data: state?.selection ?? null };
  },
});

export {};
