import { create } from "zustand";
import { createMessage, sendToBackground, sendToTab } from "@awa/messaging";
import { recordSuggestionRejected } from "@awa/analytics";

interface SidePanelState {
  fieldId: string;
  originalText: string;
  acceptSuggestion: (modified: string, requestId: string) => Promise<void>;
  rejectSuggestion: () => Promise<void>;
  /** Reverts the last applied suggestion on the active tab. Resolves to whether anything was undone. */
  undoLastSuggestion: () => Promise<boolean>;
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

export const useSidePanelStore = create<SidePanelState>(() => ({
  fieldId: "",
  originalText: "",

  acceptSuggestion: async (modified, requestId) => {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    const selection = await sendToBackground(createMessage("GET_SELECTION"));
    const fieldId = (selection.data as { fieldId: string } | null)?.fieldId ?? "";

    await sendToTab(
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
    const tabId = await getActiveTabId();
    if (tabId) await sendToTab(tabId, createMessage("CLEAR_HIGHLIGHTS"));
  },

  undoLastSuggestion: async () => {
    const tabId = await getActiveTabId();
    if (!tabId) return false;
    const response = await sendToTab(tabId, createMessage("UNDO_SUGGESTION"));
    return response?.success ?? false;
  },
}));
