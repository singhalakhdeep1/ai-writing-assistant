/**
 * Injected script — runs in page main world.
 * Module 2: Universal editor detection with debounced MutationObserver.
 * Module 3: Selection & Range API engine via selectionchange.
 */
import {
  detectEditableFields,
  observeEditorChanges,
  toSerializableField,
} from "@awa/editor-detection";
import {
  findFieldForSelection,
  getTextSelection,
  onSelectionChange,
  replaceSelectionText,
  replaceTextInElement,
} from "@awa/selection";
import type { EditableField } from "@awa/types";

/** Text currently selected inside `element` (form fields expose it via selectionStart/End). */
function getSelectedText(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    return element.value.slice(start, end);
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return "";
  return element.contains(selection.anchorNode) ? selection.toString() : "";
}

(function initInjectedScript() {
  const SOURCE = "awa-injected";
  let currentFields: EditableField[] = [];

  function notify(type: string, payload: unknown): void {
    window.postMessage({ source: SOURCE, type, payload }, "*");
  }

  function emitEditors(): void {
    currentFields = detectEditableFields();
    notify("EDITOR_DETECTED", {
      fields: currentFields.map(toSerializableField),
      hostname: window.location.hostname,
      count: currentFields.length,
    });
  }

  function emitSelection(): void {
    const field = findFieldForSelection(currentFields);
    const selection = getTextSelection(field?.id);
    notify("SELECTION_CHANGED", {
      ...selection,
      hostname: window.location.hostname,
    });
  }

  notify("INJECTED_READY", { url: window.location.href, timestamp: Date.now() });

  observeEditorChanges(() => emitEditors(), { debounceMs: 300 });

  onSelectionChange(
    () => emitSelection(),
    () => {
      const field = findFieldForSelection(currentFields);
      return field?.id;
    },
  );

  document.addEventListener(
    "focusin",
    () => {
      emitEditors();
    },
    true,
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.target !== "awa-injected") return;

    if (event.data.type === "APPLY_SUGGESTION") {
      const { fieldId, modified } = event.data.payload as {
        fieldId: string;
        modified: string;
      };
      const field = currentFields.find((f) => f.id === fieldId);
      if (!field?.element) return;

      const element = field.element;
      const isFormField =
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
      const selected = getSelectedText(element);

      let replaced: string;
      if (selected) {
        // Replace only the user's selection, never the whole field.
        replaced = selected;
        replaceSelectionText(element, modified);
      } else if (isFormField) {
        replaced = element.value;
        element.value = modified;
        element.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        replaced = element.textContent ?? "";
        element.textContent = modified;
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }

      notify("SUGGESTION_APPLIED", { fieldId, original: replaced, modified });
    }

    if (event.data.type === "UNDO_SUGGESTION") {
      const { fieldId, original, modified } = event.data.payload as {
        fieldId: string;
        original: string;
        modified: string;
      };
      const field = currentFields.find((f) => f.id === fieldId);
      const undone = field?.element
        ? replaceTextInElement(field.element, modified, original)
        : false;
      notify("SUGGESTION_UNDONE", { fieldId, success: undone });
    }
  });
})();

export {};
