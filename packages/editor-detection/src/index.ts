import type { EditableField, EditorType, SerializableEditableField } from "@awa/types";
import { debounce, generateId } from "@awa/utils";

/** Known site-specific editor selectors (Module 2). */
export const SITE_SELECTORS: Record<string, string[]> = {
  "mail.google.com": ['div[role="textbox"]', ".Am.Al.editable"],
  "www.notion.so": ['div[contenteditable="true"]'],
  "www.linkedin.com": ['div[contenteditable="true"]', ".ql-editor"],
  "github.com": ['textarea', ".commit-form textarea"],
  "app.slack.com": ['div[contenteditable="true"]', '[data-qa="message_input"]'],
  "twitter.com": ['div[contenteditable="true"]', '[data-testid="tweetTextarea_0"]'],
  "x.com": ['div[contenteditable="true"]', '[data-testid="tweetTextarea_0"]'],
  "www.reddit.com": ['div[contenteditable="true"]', 'textarea[name="body"]'],
};

const EDITABLE_SELECTORS = [
  "input[type=text]",
  "input[type=search]",
  "input[type=email]",
  "input:not([type])",
  "textarea",
  '[contenteditable="true"]',
  '[role="textbox"]',
];

const FIELD_ATTR = "data-awa-field-id";

/** Converts an EditableField to a serializable form for postMessage. */
export function toSerializableField(field: EditableField): SerializableEditableField {
  return {
    id: field.id,
    type: field.type,
    hostname: field.hostname,
    label: field.label,
  };
}

/** Tags an element with a stable field id for content-script lookup. */
export function tagEditableElement(el: Element, id: string): void {
  el.setAttribute(FIELD_ATTR, id);
}

/** Finds a tagged editable element by field id. */
export function findFieldElement(fieldId: string, root: Document | ShadowRoot = document): Element | null {
  return root.querySelector(`[${FIELD_ATTR}="${fieldId}"]`);
}

/** Detects editable fields in the DOM including Shadow DOM (Module 2). */
export function detectEditableFields(root: Document | ShadowRoot = document): EditableField[] {
  const fields: EditableField[] = [];
  const seen = new Set<Element>();
  const hostname = window.location.hostname;

  const siteSelectors = SITE_SELECTORS[hostname] ?? [];
  for (const selector of [...siteSelectors, ...EDITABLE_SELECTORS]) {
    root.querySelectorAll(selector).forEach((el) => {
      if (seen.has(el) || !isVisibleEditable(el)) return;
      seen.add(el);

      const existingId = el.getAttribute(FIELD_ATTR);
      const id = existingId ?? generateId();
      tagEditableElement(el, id);

      fields.push({
        id,
        type: getEditorType(el),
        element: el,
        hostname,
        label: getFieldLabel(el),
      });
    });
  }

  root.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) {
      fields.push(...detectEditableFields(el.shadowRoot));
    }
  });

  return fields;
}

function isVisibleEditable(el: Element): boolean {
  if (el instanceof HTMLInputElement && el.type === "hidden") return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly;
  }
  const ce = el.getAttribute("contenteditable");
  return ce === "" || ce === "true";
}

function getEditorType(el: Element): EditorType {
  if (el.tagName === "INPUT") return "input";
  if (el.tagName === "TEXTAREA") return "textarea";
  if (el.closest("*")?.shadowRoot) return "shadow-dom";
  return "contenteditable";
}

function getFieldLabel(el: Element): string | undefined {
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  return el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? undefined;
}

export interface ObserveEditorOptions {
  debounceMs?: number;
}

/** Creates a debounced MutationObserver for dynamic editor detection (Modules 2 & 14). */
export function observeEditorChanges(
  onChange: (fields: EditableField[]) => void,
  options: ObserveEditorOptions = {},
): MutationObserver {
  const debounceMs = options.debounceMs ?? 300;

  const emit = debounce(() => {
    onChange(detectEditableFields());
  }, debounceMs);

  const observer = new MutationObserver(() => {
    emit();
  });

  const target = document.body ?? document.documentElement;
  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["contenteditable", "role", "disabled", "readonly"],
  });

  onChange(detectEditableFields());

  return observer;
}
