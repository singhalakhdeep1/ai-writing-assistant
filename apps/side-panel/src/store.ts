import { create } from "zustand";
import { createMessage, sendToBackground } from "@awa/messaging";
import { recordSuggestionRejected } from "@awa/analytics";

interface SidePanelState {
  fieldId: string;
  originalText: string;
  acceptSuggestion: (modified: string, requestId: string) => Promise<void>;
  rejectSuggestion: () => Promise<void>;
}

export const useSidePanelStore = create<SidePanelState>(() => ({
  fieldId: "",
  originalText: "",

  acceptSuggestion: async (modified, requestId) => {
    const tabResponse = await sendToBackground(createMessage("GET_TAB_INFO"));
    const tabId = (tabResponse.data as { tabId: number })?.tabId;
    if (!tabId) return;

    const selection = await sendToBackground(createMessage("GET_SELECTION"));
    const fieldId = (selection.data as { fieldId: string })?.fieldId ?? "";

    await chrome.tabs.sendMessage(
      tabId,
      createMessage("APPLY_SUGGESTION", {
        fieldId,
        original: useSidePanelStore.getState().originalText,
        modified,
        requestId,
      }),
    );
  },

  rejectSuggestion: async () => {
    await recordSuggestionRejected();
    await chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        void chrome.tabs.sendMessage(tab.id, createMessage("CLEAR_HIGHLIGHTS"));
      }
    });
  },
}));
