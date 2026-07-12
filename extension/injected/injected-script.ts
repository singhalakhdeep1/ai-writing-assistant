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
} from "@awa/selection";
import type { EditableField } from "@awa/types";

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

  onSelectionChange(() => emitSelection(), () => {
    const field = findFieldForSelection(currentFields);
    return field?.id;
  });

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
      const { fieldId, modified, original } = event.data.payload as {
        fieldId: string;
        modified: string;
        original?: string;
      };
      const field = currentFields.find((f) => f.id === fieldId);
      if (!field?.element) return;

      const selection = getTextSelection(fieldId);
      if (selection?.text && original && selection.text === original) {
        replaceSelectionText(field.element, modified);
      } else if (selection?.text) {
        replaceSelectionText(field.element, modified);
      } else if (
        field.element instanceof HTMLInputElement ||
        field.element instanceof HTMLTextAreaElement
      ) {
        field.element.value = modified;
        field.element.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        field.element.textContent = modified;
        field.element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  });
})();

export {};
