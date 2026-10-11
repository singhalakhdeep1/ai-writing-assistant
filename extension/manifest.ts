import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "AI Writing Assistant",
  description:
    "Grammarly-style AI writing assistant for Gmail, Notion, LinkedIn, and any editable webpage.",
  version: "1.0.0",
  icons: {
    "16": "extension/icons/icon-16.png",
    "32": "extension/icons/icon-32.png",
    "48": "extension/icons/icon-48.png",
    "128": "extension/icons/icon-128.png",
  },
  action: {
    default_title: "AI Writing Assistant",
    default_popup: "apps/popup/index.html",
  },
  background: {
    service_worker: "extension/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["extension/content/content-script.ts"],
      run_at: "document_idle",
    },
  ],
  side_panel: {
    default_path: "apps/side-panel/index.html",
  },
  options_ui: {
    page: "apps/options/index.html",
    open_in_tab: true,
  },
  commands: {
    "fix-grammar": {
      suggested_key: { default: "Alt+Shift+G" },
      description: "Fix grammar in the selected text",
    },
    "rewrite-selection": {
      suggested_key: { default: "Alt+Shift+R" },
      description: "Rewrite the selected text",
    },
    "undo-suggestion": {
      suggested_key: { default: "Alt+Shift+Z" },
      description: "Undo the last applied suggestion",
    },
  },
  permissions: ["storage", "tabs", "activeTab", "scripting", "sidePanel"],
  host_permissions: ["<all_urls>"],
  browser_specific_settings: {
    gecko: {
      id: "ai-writing-assistant@portfolio.dev",
      strict_min_version: "109.0",
    },
  },
});
