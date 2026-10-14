import type { EditableField, TextSelection } from "@awa/types";

/** Extracts the current text selection with offset mapping (Module 3). */
export function getTextSelection(fieldId?: string): TextSelection | null {
  // Text selected inside <input>/<textarea> is not exposed through window.getSelection().
  const formField = getFocusedFormField();
  if (formField) {
    const start = formField.selectionStart ?? 0;
    const end = formField.selectionEnd ?? 0;
    if (end <= start) return null;
    const rect = getFormFieldSelectionRect(formField, start, end);
    return {
      text: formField.value.slice(start, end),
      startOffset: start,
      endOffset: end,
      fieldId: fieldId ?? "unknown",
      caretRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };
  }

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

type FormField = HTMLInputElement | HTMLTextAreaElement;
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", ""]);

/** The focused text input or textarea, looking through open shadow roots. */
export function getFocusedFormField(root: Document | ShadowRoot = document): FormField | null {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  if (active instanceof HTMLTextAreaElement) return active;
  if (active instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(active.type)) return active;
  return null;
}

const MIRRORED_STYLES = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

/**
 * Viewport rectangle of characters [start, end) inside a form field, measured with an
 * off-screen mirror element that copies the field's box and text styles.
 */
export function getFormFieldSelectionRect(field: FormField, start: number, end: number): DOMRect {
  const fieldRect = field.getBoundingClientRect();
  const computed = window.getComputedStyle(field);
  const mirror = document.createElement("div");
  const style = mirror.style;
  for (const prop of MIRRORED_STYLES) style[prop] = computed[prop];
  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "0";
  style.left = "-9999px";
  style.whiteSpace = field instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  style.overflowWrap = "break-word";

  mirror.textContent = field.value.slice(0, start);
  const marker = document.createElement("span");
  marker.textContent = field.value.slice(start, end) || "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const offsetTop = marker.offsetTop - field.scrollTop;
  const offsetLeft = marker.offsetLeft - field.scrollLeft;
  const lineHeight = Number.parseFloat(computed.lineHeight) || marker.offsetHeight;
  mirror.remove();

  // A multi-line selection reports its first line; clamp into the visible field area.
  const top = Math.min(
    Math.max(fieldRect.top + offsetTop, fieldRect.top),
    fieldRect.bottom - lineHeight,
  );
  const left = Math.min(Math.max(fieldRect.left + offsetLeft, fieldRect.left), fieldRect.right - 1);
  return new DOMRect(left, top, Math.min(marker.offsetWidth, fieldRect.right - left), lineHeight);
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
  const formField = getFocusedFormField();
  if (formField) return fields.find((field) => field.element === formField) ?? null;

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
  // Chromium reports form-field selections via "select" (keyboard/mouse) as well as
  // "selectionchange"; listen to both so text fields work everywhere.
  document.addEventListener("selectionchange", handler);
  document.addEventListener("select", handler, true);
  return () => {
    document.removeEventListener("selectionchange", handler);
    document.removeEventListener("select", handler, true);
  };
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
