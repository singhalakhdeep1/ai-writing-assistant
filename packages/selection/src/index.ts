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

/** Location of a text match across a sequence of text nodes. */
export interface TextMatch {
  startNode: number;
  startOffset: number;
  endNode: number;
  endOffset: number;
}

/**
 * Finds the first occurrence of `search` in the concatenation of `texts`
 * and maps it back to (node index, offset) pairs. Pure so it is unit-testable.
 */
export function findTextMatch(texts: string[], search: string): TextMatch | null {
  if (!search) return null;
  const index = texts.join("").indexOf(search);
  if (index < 0) return null;

  const locate = (position: number, isEnd: boolean): [number, number] => {
    let consumed = 0;
    for (let i = 0; i < texts.length; i++) {
      const len = texts[i]!.length;
      const within = isEnd ? position <= consumed + len : position < consumed + len;
      if (within) return [i, position - consumed];
      consumed += len;
    }
    return [texts.length - 1, texts[texts.length - 1]!.length];
  };

  const [startNode, startOffset] = locate(index, false);
  const [endNode, endOffset] = locate(index + search.length, true);
  return { startNode, startOffset, endNode, endOffset };
}

/**
 * Replaces the first occurrence of `search` inside an editable element with `replacement`.
 * Used to undo an applied suggestion without relying on the (now gone) selection.
 */
export function replaceTextInElement(
  element: Element,
  search: string,
  replacement: string,
): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const at = element.value.indexOf(search);
    if (!search || at < 0) return false;
    element.value =
      element.value.slice(0, at) + replacement + element.value.slice(at + search.length);
    element.selectionStart = at;
    element.selectionEnd = at + replacement.length;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);

  const match = findTextMatch(
    nodes.map((n) => n.data),
    search,
  );
  if (!match) return false;

  const range = document.createRange();
  range.setStart(nodes[match.startNode]!, match.startOffset);
  range.setEnd(nodes[match.endNode]!, match.endOffset);
  range.deleteContents();
  const inserted = document.createTextNode(replacement);
  range.insertNode(inserted);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
