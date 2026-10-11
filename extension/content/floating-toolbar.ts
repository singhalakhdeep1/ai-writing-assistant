import type { WritingAction } from "@awa/types";

const TOOLBAR_ID = "awa-floating-toolbar";

/** Keyboard shortcut letters (Alt+Shift+<key>) declared in the manifest `commands`. */
const SHORTCUT_KEYS: Partial<Record<WritingAction, string>> = {
  grammar: "G",
  rewrite: "R",
};

const ACTIONS: Array<{ action: WritingAction; label: string; icon: string }> = [
  { action: "grammar", label: "Fix Grammar", icon: "✓" },
  { action: "rewrite", label: "Rewrite", icon: "↻" },
  { action: "tone-formal", label: "Formal", icon: "◇" },
  { action: "summarize", label: "Summarize", icon: "…" },
];

export type ToolbarMode = "actions" | "undo";

export interface FloatingToolbarOptions {
  onAction: (action: WritingAction) => void;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Creates a shadow-DOM floating suggestion toolbar (Module 9). */
export function createFloatingToolbar(options: FloatingToolbarOptions): {
  show: (
    rect: { top: number; left: number; width: number; height: number },
    mode?: ToolbarMode,
  ) => void;
  hide: () => void;
  isVisible: () => boolean;
  destroy: () => void;
} {
  const host = document.createElement("div");
  host.id = TOOLBAR_ID;
  host.style.all = "initial";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    .awa-toolbar {
      position: fixed;
      z-index: 2147483647;
      display: flex;
      gap: 4px;
      padding: 6px;
      background: #1e293b;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
      font-family: system-ui, -apple-system, sans-serif;
      animation: awa-fade-in 0.15s ease;
    }
    @keyframes awa-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .awa-btn {
      all: unset;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
      color: #f1f5f9;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .awa-btn:hover { background: #334155; }
    .awa-btn-icon { font-size: 14px; opacity: 0.8; }
    .awa-dismiss {
      all: unset;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      color: #94a3b8;
      font-size: 14px;
    }
    .awa-dismiss:hover { background: #334155; color: #f1f5f9; }
  `;

  const toolbar = document.createElement("div");
  toolbar.className = "awa-toolbar";
  toolbar.style.display = "none";

  const actionButtons: HTMLElement[] = [];
  for (const { action, label, icon } of ACTIONS) {
    const btn = document.createElement("button");
    btn.className = "awa-btn";
    const key = SHORTCUT_KEYS[action];
    btn.title = key ? `${label} (Alt+Shift+${key})` : label;
    const iconEl = document.createElement("span");
    iconEl.className = "awa-btn-icon";
    iconEl.textContent = icon;
    btn.append(iconEl, document.createTextNode(label));
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      options.onAction(action);
    });
    toolbar.appendChild(btn);
    actionButtons.push(btn);
  }

  const undoBtn = document.createElement("button");
  undoBtn.className = "awa-btn";
  undoBtn.title = "Undo last applied suggestion (Alt+Shift+Z)";
  undoBtn.textContent = "↶ Applied — Undo";
  undoBtn.style.display = "none";
  undoBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    options.onUndo();
  });
  toolbar.appendChild(undoBtn);

  const dismiss = document.createElement("button");
  dismiss.className = "awa-dismiss";
  dismiss.textContent = "×";
  dismiss.addEventListener("mousedown", (e) => {
    e.preventDefault();
    options.onDismiss();
  });
  toolbar.appendChild(dismiss);

  shadow.appendChild(style);
  shadow.appendChild(toolbar);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && toolbar.style.display !== "none") options.onDismiss();
  };
  document.addEventListener("keydown", onKeyDown, true);

  return {
    show(rect, mode = "actions") {
      for (const btn of actionButtons) btn.style.display = mode === "actions" ? "flex" : "none";
      undoBtn.style.display = mode === "undo" ? "flex" : "none";
      const top = rect.top + window.scrollY - 48;
      const left = rect.left + window.scrollX + rect.width / 2;
      toolbar.style.display = "flex";
      toolbar.style.top = `${Math.max(8, top)}px`;
      toolbar.style.left = `${Math.max(8, left)}px`;
      toolbar.style.transform = "translateX(-50%)";
    },
    hide() {
      toolbar.style.display = "none";
    },
    isVisible() {
      return toolbar.style.display !== "none";
    },
    destroy() {
      document.removeEventListener("keydown", onKeyDown, true);
      host.remove();
    },
  };
}

export function injectHighlightStyles(): void {
  if (document.getElementById("awa-highlight-styles")) return;
  const style = document.createElement("style");
  style.id = "awa-highlight-styles";
  style.textContent = `
    ::highlight(awa-error) { text-decoration: underline wavy #ef4444; }
    ::highlight(awa-warning) { text-decoration: underline wavy #f59e0b; }
    ::highlight(awa-suggestion) { text-decoration: underline wavy #3b82f6; }
  `;
  document.head.appendChild(style);
}
