import { create } from "zustand";
import type { WritingAction } from "@awa/types";
import { createMessage, sendToBackground } from "@awa/messaging";

interface PopupState {
  selectedText: string;
  fieldId: string;
  isLoadingSelection: boolean;
  activeAction: WritingAction | null;
  fetchSelection: () => Promise<void>;
  runAction: (action: WritingAction) => Promise<string | null>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  selectedText: "",
  fieldId: "",
  isLoadingSelection: false,
  activeAction: null,

  fetchSelection: async () => {
    set({ isLoadingSelection: true });
    const response = await sendToBackground(createMessage("GET_SELECTION"));
    const data = response.data as { text: string; fieldId: string } | null;
    set({
      selectedText: data?.text ?? "",
      fieldId: data?.fieldId ?? "",
      isLoadingSelection: false,
    });
  },

  runAction: async (action) => {
    set({ activeAction: action });
    const { selectedText } = get();
    const tabResponse = await sendToBackground(createMessage("GET_TAB_INFO"));
    const hostname = tabResponse.data
      ? new URL((tabResponse.data as { url: string }).url).hostname
      : undefined;

    const response = await sendToBackground(
      createMessage("AI_REQUEST", {
        action,
        text: selectedText,
        hostname,
      }),
    );

    set({ activeAction: null });
    if (!response.success) return null;
    return (response.data as { requestId: string }).requestId;
  },
}));
