/** Highlight severity for grammar suggestions (Module 8). */
export type HighlightSeverity = "error" | "warning" | "suggestion";

/** A virtual highlight range (Module 8 — CSS Highlight API). */
export interface HighlightRange {
  start: number;
  end: number;
  severity: HighlightSeverity;
  message: string;
}

const HIGHLIGHT_NAMES: Record<HighlightSeverity, string> = {
  error: "awa-error",
  warning: "awa-warning",
  suggestion: "awa-suggestion",
};

/** Applies highlights using CSS Highlight API (Module 8). */
export function applyHighlights(ranges: HighlightRange[], root: Node): void {
  if (!("Highlight" in window)) return;

  clearHighlights();

  const grouped = groupBySeverity(ranges);
  for (const [severity, severityRanges] of Object.entries(grouped)) {
    const name = HIGHLIGHT_NAMES[severity as HighlightSeverity];
    const highlightRanges = severityRanges.map((r) => createRangeFromOffsets(root, r));
    // @ts-expect-error CSS Highlight API
    CSS.highlights.set(name, new Highlight(...highlightRanges.filter(Boolean)));
  }
}

/** Removes all extension highlights. */
export function clearHighlights(): void {
  if (!("Highlight" in window)) return;
  for (const name of Object.values(HIGHLIGHT_NAMES)) {
    CSS.highlights.delete(name);
  }
}

/** Fallback highlights for input/textarea (CSS Highlight API unsupported). */
export function applyFieldHighlights(
  el: HTMLInputElement | HTMLTextAreaElement,
  ranges: HighlightRange[],
): void {
  if (ranges.length === 0) {
    el.style.outline = "";
    el.removeAttribute("aria-description");
    return;
  }
  const hasError = ranges.some((r) => r.severity === "error");
  el.style.outline = `2px solid ${hasError ? "#ef4444" : "#f59e0b"}`;
  el.setAttribute("aria-description", ranges.map((r) => r.message).join("; "));
}

/** Applies highlights to contenteditable or falls back for form fields. */
export function applyHighlightsToElement(element: HTMLElement, ranges: HighlightRange[]): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    applyFieldHighlights(element, ranges);
    return;
  }
  applyHighlights(ranges, element);
}

function groupBySeverity(ranges: HighlightRange[]): Record<string, HighlightRange[]> {
  return ranges.reduce<Record<string, HighlightRange[]>>((acc, range) => {
    const key = range.severity;
    acc[key] = acc[key] ?? [];
    acc[key].push(range);
    return acc;
  }, {});
}

function createRangeFromOffsets(root: Node, highlight: HighlightRange): Range | null {
  try {
    const range = document.createRange();
    const text = root.textContent ?? "";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const len = node.textContent?.length ?? 0;
      if (offset + len > highlight.start) {
        range.setStart(node, highlight.start - offset);
        range.setEnd(node, Math.min(highlight.end - offset, len));
        return range;
      }
      offset += len;
    }

    void text; // used for length reference
    return null;
  } catch {
    return null;
  }
}
