import type { EditableField, TextSelection } from "@awa/types";

/** Extracts the current text selection with offset mapping (Module 3). */
export function getTextSelection(fieldId?: string): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const text = range.toString();
  if (!text && selection.isCollapsed) return null;

  const rect = range.getBoundingClientRect();

  return {
    text,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    fieldId: fieldId ?? "unknown",
    caretRect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
  };
}

/** Gets caret position as DOMRect for floating UI placement (Module 3). */
export function getCaretRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return selection.getRangeAt(0).getBoundingClientRect();
}

/** Finds the editable field containing the current selection. */
export function findFieldForSelection(
  fields: EditableField[],
  selection: Selection = window.getSelection()!,
): EditableField | null {
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.getRangeAt(0).commonAncestorContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!element) return null;

  for (const field of fields) {
    if (field.element?.contains(element)) return field;
  }
  return null;
}

/** Tracks selection changes via selectionchange event (Module 3). */
export function onSelectionChange(
  callback: (selection: TextSelection | null) => void,
  getFieldId?: () => string | undefined,
): () => void {
  const handler = () => callback(getTextSelection(getFieldId?.()));
  document.addEventListener("selectionchange", handler);
  return () => document.removeEventListener("selectionchange", handler);
}

/** Maps a Range back to character offsets within a container (Module 3). */
export function mapRangeToOffsets(
  range: Range,
  container: Node,
): { start: number; end: number } | null {
  if (!container.contains(range.startContainer)) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);

  const start = preRange.toString().length;
  return { start, end: start + range.toString().length };
}

/** Replaces selected text within an editable element. */
export function replaceSelectionText(element: Element, newText: string): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const value = element.value;
    element.value = value.slice(0, start) + newText + value.slice(end);
    element.selectionStart = element.selectionEnd = start + newText.length;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  selection.removeAllRanges();
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
