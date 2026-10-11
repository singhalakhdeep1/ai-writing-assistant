import { createMessage, onMessage } from "@awa/messaging";
import { findFieldElement } from "@awa/editor-detection";
import { applyHighlightsToElement, clearHighlights } from "@awa/highlights";
import { diffSentences } from "@awa/diff";
import { recordAcceptedEdit } from "@awa/analytics";
import type { HighlightPayload, SuggestionPayload, TextSelection, WritingAction } from "@awa/types";
import { logger } from "@awa/utils";
import injectedScriptUrl from "../injected/injected-script?script&module";
import { createFloatingToolbar, injectHighlightStyles } from "./floating-toolbar";

logger.info("Content script loaded", { url: window.location.href });

interface AppliedEdit {
  fieldId: string;
  original: string;
  modified: string;
}

const MAX_UNDO_DEPTH = 20;
const UNDO_TOAST_MS = 6000;

let lastSelection: TextSelection | null = null;
let toolbarHideTimer: ReturnType<typeof setTimeout> | null = null;
let undoToastUntil = 0;
const undoStack: AppliedEdit[] = [];

function injectPageScript(): void {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(injectedScriptUrl);
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

injectPageScript();
injectHighlightStyles();

/** Starts an AI request for the current selection (toolbar button or keyboard shortcut). */
function runAction(action: WritingAction): boolean {
  if (!lastSelection?.text) return false;
  void chrome.runtime.sendMessage(
    createMessage("AI_REQUEST", {
      action,
      text: lastSelection.text,
      hostname: window.location.hostname,
    }),
  );
  return true;
}

/** Reverts the most recently applied suggestion in the page world. */
function undoLastSuggestion(): boolean {
  const edit = undoStack.pop();
  if (!edit) return false;
  window.postMessage({ target: "awa-injected", type: "UNDO_SUGGESTION", payload: edit }, "*");
  return true;
}

function scheduleToolbarHide(ms: number): void {
  if (toolbarHideTimer) clearTimeout(toolbarHideTimer);
  toolbarHideTimer = setTimeout(() => toolbar.hide(), ms);
}

const toolbar = createFloatingToolbar({
  onAction: (action) => {
    if (runAction(action)) toolbar.hide();
  },
  onUndo: () => {
    undoLastSuggestion();
    toolbar.hide();
  },
  onDismiss: () => toolbar.hide(),
});

onMessage({
  PING: () => ({ success: true, data: "PONG from content script" }),

  APPLY_HIGHLIGHTS: (message) => {
    const payload = message.payload as HighlightPayload;
    const element = findFieldElement(payload.fieldId) as HTMLElement | null;
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
    window.postMessage({ target: "awa-injected", type: "APPLY_SUGGESTION", payload }, "*");
    clearHighlights();
    return { success: true };
  },

  UNDO_SUGGESTION: () =>
    undoLastSuggestion() ? { success: true } : { success: false, error: "Nothing to undo" },

  RUN_ACTION: (message) => {
    const { action } = (message.payload ?? {}) as { action?: WritingAction };
    if (!action) return { success: false, error: "Missing action" };
    return runAction(action)
      ? { success: true }
      : { success: false, error: "Select some text first" };
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

  if (event.data.type === "SUGGESTION_APPLIED") {
    const edit = event.data.payload as AppliedEdit;
    undoStack.push(edit);
    if (undoStack.length > MAX_UNDO_DEPTH) undoStack.shift();
    void recordAcceptedEdit(edit.original, edit.modified);

    if (lastSelection?.caretRect) {
      undoToastUntil = Date.now() + UNDO_TOAST_MS;
      toolbar.show(lastSelection.caretRect, "undo");
      scheduleToolbarHide(UNDO_TOAST_MS);
    }
  }

  if (event.data.type === "SELECTION_CHANGED") {
    const payload = event.data.payload as TextSelection | null;
    lastSelection = payload?.text ? payload : null;

    void chrome.runtime.sendMessage(
      createMessage("SELECTION_CHANGED", {
        ...payload,
        hostname: window.location.hostname,
      }),
    );

    if (lastSelection?.caretRect && lastSelection.text.length > 2) {
      toolbar.show(lastSelection.caretRect);
      scheduleToolbarHide(8000);
    } else {
      // Selection collapsed. Keep the "Applied — Undo" toast alive until it times out.
      if (Date.now() > undoToastUntil) toolbar.hide();
      clearHighlights();
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "AI_STREAM_DONE") return;

  const { fullText, action } = message.payload as {
    fullText: string;
    requestId: string;
    action?: WritingAction;
  };
  // Explanations are shown in the side panel only; never highlight or apply them.
  if (action === "explain") return;

  const selection = lastSelection;
  if (!selection?.text || !fullText || !selection.fieldId) return;

  const element = findFieldElement(selection.fieldId) as HTMLElement | null;
  const changed = diffSentences(selection.text, fullText).filter((d) => d.changed);
  if (!element || changed.length === 0) return;

  applyHighlightsToElement(
    element,
    changed
      .map((d) => {
        const start = selection.text.indexOf(d.original);
        return {
          start,
          end: start + d.original.length,
          severity: "warning" as const,
          message: `Suggested: ${d.modified}`,
        };
      })
      .filter((r) => r.start >= 0 && r.end > r.start),
  );
});

export {};
