import { createMessage, onMessage } from "@awa/messaging";
import { findFieldElement } from "@awa/editor-detection";
import { applyHighlightsToElement, clearHighlights } from "@awa/highlights";
import { diffSentences } from "@awa/diff";
import { recordSuggestionAccepted } from "@awa/analytics";
import type { HighlightPayload, SuggestionPayload, TextSelection } from "@awa/types";
import { logger } from "@awa/utils";
import { createFloatingToolbar, injectHighlightStyles } from "./floating-toolbar";

logger.info("Content script loaded", { url: window.location.href });

let lastSelection: TextSelection | null = null;
let toolbarHideTimer: ReturnType<typeof setTimeout> | null = null;

function injectPageScript(): void {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected/injected-script.js");
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

injectPageScript();
injectHighlightStyles();

const toolbar = createFloatingToolbar({
  onAction: (action) => {
    if (!lastSelection?.text) return;
    void chrome.runtime.sendMessage(
      createMessage("AI_REQUEST", {
        action,
        text: lastSelection.text,
        hostname: window.location.hostname,
      }),
    );
    toolbar.hide();
  },
  onDismiss: () => toolbar.hide(),
});

onMessage({
  PING: () => ({ success: true, data: "PONG from content script" }),

  APPLY_HIGHLIGHTS: (message) => {
    const payload = message.payload as HighlightPayload;
    const element = findFieldElement(payload.fieldId);
    if (!element) return { success: false, error: "Field not found" };
    applyHighlightsToElement(element, payload.ranges);
    return { success: true };
  },

  CLEAR_HIGHLIGHTS: () => {
    clearHighlights();
    return { success: true };
  },

  APPLY_SUGGESTION: (message) => {
    const payload = message.payload as SuggestionPayload;
    window.postMessage(
      { target: "awa-injected", type: "APPLY_SUGGESTION", payload },
      "*",
    );
    void recordSuggestionAccepted();
    return { success: true };
  },

  SHOW_TOOLBAR: () => {
    if (lastSelection?.caretRect) toolbar.show(lastSelection.caretRect);
    return { success: true };
  },

  HIDE_TOOLBAR: () => {
    toolbar.hide();
    return { success: true };
  },
});

void chrome.runtime.sendMessage(createMessage("EXTENSION_READY"));

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "awa-injected") return;

  if (event.data.type === "EDITOR_DETECTED") {
    void chrome.runtime.sendMessage(createMessage("EDITOR_DETECTED", event.data.payload));
  }

  if (event.data.type === "SELECTION_CHANGED") {
    const payload = event.data.payload as TextSelection | null;
    lastSelection = payload?.text ? payload : null;

    void chrome.runtime.sendMessage(createMessage("SELECTION_CHANGED", {
      ...payload,
      hostname: window.location.hostname,
    }));

    if (lastSelection?.caretRect && lastSelection.text.length > 2) {
      toolbar.show(lastSelection.caretRect);
      if (toolbarHideTimer) clearTimeout(toolbarHideTimer);
      toolbarHideTimer = setTimeout(() => toolbar.hide(), 8000);
    } else {
      toolbar.hide();
      clearHighlights();
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "AI_STREAM_DONE") {
    const { fullText } = message.payload as { fullText: string; requestId: string };
    if (lastSelection?.text && fullText && lastSelection.fieldId) {
      const diffs = diffSentences(lastSelection.text, fullText);
      const changed = diffs.filter((d) => d.changed);
      const element = findFieldElement(lastSelection.fieldId);
      if (element && changed.length > 0) {
        applyHighlightsToElement(
          changed
            .map((d) => ({
              start: lastSelection!.text.indexOf(d.original),
              end: lastSelection!.text.indexOf(d.original) + d.original.length,
              severity: "warning" as const,
              message: `Suggested: ${d.modified}`,
            }))
            .filter((r) => r.start >= 0),
          element,
        );
      }
    }
  }
});

export {};
