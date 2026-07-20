# AI Writing Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Chrome Extension](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

A **Grammarly-style Manifest V3 Chrome extension** for AI-powered writing assistance across Gmail, Notion, LinkedIn, Slack, GitHub, and any editable webpage — with **streaming LLM responses**, privacy controls, and on-device fallback.

> **Portfolio status:** ~**82% complete** · 7 ✅ · 8 ⚠️ · 0 ❌ (15 modules)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Chrome Extension Surfaces](#chrome-extension-surfaces)
- [Browser APIs Used](#browser-apis-used)
- [AI Providers](#ai-providers)
- [Project Structure](#project-structure)
- [Package Map](#package-map)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Testing](#testing)
- [Architecture](#architecture)
- [Message Passing](#message-passing)
- [Module Progress](#module-progress)
- [Privacy & Security](#privacy--security)
- [CI/CD](#cicd)
- [Browser Support](#browser-support)
- [Interview Highlights](#interview-highlights)
- [Remaining Work](#remaining-work)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

Select text on any editable field → floating toolbar appears → choose a writing action → AI streams results in the side panel → accept to apply changes back to your **selection** (not the whole field).

Supports **9 writing actions** across **4 AI providers** with automatic failover, on-device Gemini Nano fallback, and privacy-first site controls.

---

## Features

| Feature                    | Status | Implementation                                           |
| -------------------------- | ------ | -------------------------------------------------------- |
| Universal editor detection | ✅     | Shadow DOM, MutationObserver, site selectors             |
| Selection & Range engine   | ✅     | `selectionchange`, caret rect, range-aware apply         |
| OpenAI streaming           | ✅     | SSE adapter in `@awa/ai-providers`                       |
| Google Gemini streaming    | ✅     | REST streaming adapter                                   |
| Anthropic Claude streaming | ✅     | SSE adapter                                              |
| Gemini Nano on-device      | ✅     | `window.ai` LanguageModel API                            |
| Provider failover          | ✅     | Lazy init + automatic fallback chain                     |
| 9 writing actions          | ✅     | Grammar, rewrite, tone, summarize, etc.                  |
| Real-time streaming        | ✅     | `AbortController` + side panel rendering                 |
| Sentence-level diff        | ⚠️     | `Intl.Segmenter`; not Myers/LCS                          |
| CSS Highlight API          | ⚠️     | Contenteditable; input/textarea outline fallback         |
| Floating toolbar           | ⚠️     | Shadow DOM quick actions; no undo UI                     |
| Context-aware prompts      | ✅     | Hostname → email, social, code, resume                   |
| Privacy controls           | ✅     | On-device mode, allowlist, blocklist, dictionary masking |
| Local analytics            | ⚠️     | Counters + weekly report; no reading level               |
| Debounced detection        | ✅     | 300ms MutationObserver debounce                          |
| Firefox manifest           | ✅     | `browser_specific_settings.gecko`                        |
| Chrome Store assets        | ⚠️     | Listing copy; no screenshot PNGs                         |

---

## Tech Stack

### Core

| Category        | Technology        | Version  | Purpose                             |
| --------------- | ----------------- | -------- | ----------------------------------- |
| Language        | TypeScript        | 5.9      | Strict typing across all contexts   |
| UI Framework    | React             | 19       | Popup, side panel, options, landing |
| Build Tool      | Vite              | 6        | Fast HMR dev server                 |
| Extension Build | CRXJS Vite Plugin | 2.0 beta | MV3 bundling + hot reload           |
| Package Manager | pnpm              | 9        | Workspace dependency management     |
| Monorepo        | Turborepo         | 2.10     | Parallel builds, task caching       |

### UI & Styling

| Category        | Technology          | Purpose                                |
| --------------- | ------------------- | -------------------------------------- |
| CSS             | Tailwind CSS        | 4                                      | Utility-first styling |
| Tailwind Plugin | `@tailwindcss/vite` | Vite integration                       |
| Components      | `@awa/ui`           | Shared Button, Card, Header, MetricRow |

### AI & Streaming

| Category      | Technology                           | Purpose                                |
| ------------- | ------------------------------------ | -------------------------------------- |
| OpenAI        | GPT API (SSE)                        | Cloud grammar/rewrite via adapter      |
| Google Gemini | Gemini API                           | Cloud streaming adapter                |
| Anthropic     | Claude API (SSE)                     | Cloud streaming adapter                |
| Gemini Nano   | `window.ai` LanguageModel            | On-device inference                    |
| Streaming     | `ReadableStream` + `AbortController` | Cancellable token-by-token output      |
| Prompts       | `@awa/prompts`                       | 9 action templates + context injection |

### Chrome Extension Platform

| API                | Used In             | Purpose                          |
| ------------------ | ------------------- | -------------------------------- |
| `chrome.runtime`   | All contexts        | Message passing, streaming relay |
| `chrome.storage`   | Background, Options | API keys, privacy settings       |
| `chrome.sidePanel` | Background, Popup   | Side panel for streaming results |
| `chrome.tabs`      | Background          | Active tab routing               |
| `chrome.scripting` | Manifest permission | Dynamic script injection         |

### DOM & Text APIs

| API                   | Package            | Purpose                          |
| --------------------- | ------------------ | -------------------------------- |
| `MutationObserver`    | `editor-detection` | Dynamic editor discovery         |
| `Selection` / `Range` | `selection`        | Text extraction + caret position |
| `TreeWalker`          | `editor-detection` | Shadow DOM traversal             |
| `CSS Highlight API`   | `highlights`       | Zero-DOM-mutation underlines     |
| `Intl.Segmenter`      | `diff`             | Sentence-level text segmentation |
| `window.postMessage`  | content ↔ injected | Cross-world communication        |

### Testing & Quality

| Category   | Technology          | Purpose                  |
| ---------- | ------------------- | ------------------------ |
| Unit Tests | Vitest              | 3.1                      | diff, prompts, providers, streaming |
| E2E Tests  | Playwright          | 1.51                     | Browser API validation              |
| Linting    | ESLint              | 9                        | Shared `@repo/eslint-config`        |
| Formatting | Prettier            | 3.7                      | Code style                          |
| Git Hooks  | Husky + lint-staged | Pre-commit quality gate  |
| CI/CD      | GitHub Actions      | Full pipeline on push/PR |

---

## Chrome Extension Surfaces

| Surface             | Path                    | Description                                       |
| ------------------- | ----------------------- | ------------------------------------------------- |
| **Popup**           | `apps/popup/`           | Quick actions, selection preview, open side panel |
| **Side Panel**      | `apps/side-panel/`      | Streaming AI output + diff view                   |
| **Options Page**    | `apps/options/`         | API keys, privacy, analytics report               |
| **Landing Page**    | `apps/landing/`         | Static marketing page                             |
| **Background SW**   | `extension/background/` | AI routing, privacy filter, analytics             |
| **Content Script**  | `extension/content/`    | Floating toolbar, highlights, apply bridge        |
| **Injected Script** | `extension/injected/`   | Page-world editor detection + selection           |

### Manifest Permissions

```
storage · tabs · activeTab · scripting · sidePanel
host_permissions: <all_urls>
```

---

## Browser APIs Used

| API                       | Module | What It Does                            |
| ------------------------- | ------ | --------------------------------------- |
| `MutationObserver`        | M2     | Detect dynamically added editors        |
| `Selection` / `Range`     | M3     | Extract selected text + caret rect      |
| `Shadow DOM` traversal    | M2     | Find editors inside web components      |
| `CSS Highlight API`       | M8     | Grammar underlines without DOM mutation |
| `Intl.Segmenter`          | M7     | Sentence-boundary diff                  |
| `AbortController`         | M6     | Cancel in-flight AI streams             |
| `ReadableStream`          | M6     | Process streaming API responses         |
| `window.ai` (Gemini Nano) | M4     | On-device language model                |
| `chrome.storage.local`    | M11    | API keys + privacy settings             |

---

## AI Providers

| Provider         | ID            | Auth                | Streaming   | On-Device |
| ---------------- | ------------- | ------------------- | ----------- | --------- |
| OpenAI           | `openai`      | API key in Options  | SSE         | ❌        |
| Google Gemini    | `gemini`      | API key in Options  | REST stream | ❌        |
| Anthropic Claude | `anthropic`   | API key in Options  | SSE         | ❌        |
| Gemini Nano      | `gemini-nano` | Built-in browser AI | Local       | ✅        |

**Failover chain:** Preferred provider → next available → Gemini Nano (if on-device mode enabled).

### Supported Writing Actions

| Action        | ID              | Description                  |
| ------------- | --------------- | ---------------------------- |
| Fix Grammar   | `grammar`       | Correct grammar and spelling |
| Rewrite       | `rewrite`       | Improve clarity and flow     |
| Formal Tone   | `tone-formal`   | Make text more professional  |
| Friendly Tone | `tone-friendly` | Make text warmer             |
| Summarize     | `summarize`     | Condense to key points       |
| Translate     | `translate`     | Translate to target language |
| Expand        | `expand`        | Add detail and context       |
| Shorten       | `shorten`       | Reduce word count            |
| Custom        | `custom`        | User-defined prompt          |

---

## Project Structure

```
ai-writing-assistant/
├── apps/
│   ├── popup/              # Quick actions + selection preview
│   ├── side-panel/         # Streaming output + diff view
│   ├── options/            # API keys, privacy, analytics
│   └── landing/            # Marketing landing page
├── extension/
│   ├── background/
│   │   ├── service-worker.ts   # Message hub
│   │   ├── ai-handler.ts       # AI routing + streaming
│   │   └── privacy.ts          # Site allowlist + dictionary masking
│   ├── content/
│   │   ├── content-script.ts   # Toolbar + highlights bridge
│   │   └── floating-toolbar.ts # Shadow DOM quick actions
│   ├── injected/
│   │   └── injected-script.ts  # Page-world detection + selection
│   └── manifest.ts
├── packages/
│   ├── editor-detection/   # M2 — universal editor finder
│   ├── selection/          # M3 — Range/Selection API
│   ├── ai-providers/       # M4 — LLM adapter layer
│   ├── prompts/            # M5 — 9 action templates
│   ├── streaming/          # M6 — AbortController engine
│   ├── diff/               # M7 — sentence-level diff
│   ├── highlights/         # M8 — CSS Highlight API
│   ├── analytics/          # M12 — local usage metrics
│   ├── messaging/          # Typed cross-context messages
│   ├── hooks/              # useSettings, useAnalytics, useSelection
│   ├── ui/                 # Shared React components
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Logger, helpers
├── tests/e2e/
├── store/
├── docs/
├── scripts/generate-icons.mjs
├── .github/workflows/ci.yml
├── turbo.json
└── package.json
```

---

## Package Map

| Package                 | Scope | Key Exports                                                     |
| ----------------------- | ----- | --------------------------------------------------------------- |
| `@awa/editor-detection` | M2    | `findEditableFields`, `findFieldElement`, site selectors        |
| `@awa/selection`        | M3    | `getSelectionInfo`, `replaceSelectionText`, `onSelectionChange` |
| `@awa/ai-providers`     | M4    | `getProvider`, `getAvailableProvider`, provider adapters        |
| `@awa/prompts`          | M5    | `buildPrompt`, `buildPromptWithContext`                         |
| `@awa/streaming`        | M6    | `createStreamRequest`, `abortStream`, `completeStream`          |
| `@awa/diff`             | M7    | `diffSentences`, `wordDiff`, `segmentSentences`                 |
| `@awa/highlights`       | M8    | `applyHighlights`, `applyFieldHighlights`, `clearHighlights`    |
| `@awa/analytics`        | M12   | `recordSuggestionShown`, `generateWeeklyReport`                 |
| `@awa/messaging`        | —     | `createMessage`, `onMessage`                                    |
| `@awa/hooks`            | —     | `useSettings`, `useAnalytics`, `openSidePanel`                  |
| `@awa/extension`        | —     | CRXJS entry — bundles all contexts                              |

---

## Getting Started

### Prerequisites

| Tool          | Version                                    |
| ------------- | ------------------------------------------ |
| Node.js       | 22 LTS+                                    |
| pnpm          | 9+                                         |
| Google Chrome | Latest                                     |
| AI API key    | OpenAI, Gemini, or Anthropic (one minimum) |

### Install

```bash
git clone <your-repo-url>
cd ai-writing-assistant
pnpm install
node scripts/generate-icons.mjs
```

### Development

```bash
pnpm dev    # CRXJS dev server — port 5174
```

### Production Build

```bash
pnpm build  # Output → extension/dist/
```

### Load in Chrome

1. Run `pnpm build` (or `pnpm dev`)
2. Open `chrome://extensions` → **Developer mode** ON
3. **Load unpacked** → `extension/dist`
4. Open **Options** → add API key(s) → choose preferred provider
5. Navigate to Gmail, Notion, or any editable page → select text

---

## Usage Guide

```
1. Open any page with an editable field (Gmail, Notion, LinkedIn, etc.)
2. Select text → floating toolbar appears near caret
3. Click an action (Grammar, Rewrite, Formal, Summarize, …)
4. Side panel opens automatically → AI streams results live
5. Review diff → Accept to apply suggestion to your selection
6. Cancel anytime with Abort (stops the stream)
```

### Supported Sites (Built-in Selectors)

Gmail · Google Docs · Notion · LinkedIn · Slack · GitHub · Reddit · Twitter/X · Generic `contenteditable` / `input` / `textarea`

---

## Development

### Available Scripts

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | CRXJS dev server with HMR (port **5174**) |
| `pnpm build`       | Typecheck + production build              |
| `pnpm test`        | Vitest unit tests                         |
| `pnpm test:e2e`    | Playwright E2E                            |
| `pnpm lint`        | ESLint all workspaces                     |
| `pnpm check-types` | TypeScript check                          |
| `pnpm format`      | Prettier write                            |

### Configure API Keys

Options page → enter keys for OpenAI / Gemini / Anthropic → set preferred provider → Save.

Keys stored in `chrome.storage.local` — never sent anywhere except the chosen AI provider.

---

## Testing

| Layer  | Tool       | Packages Tested                                                                 |
| ------ | ---------- | ------------------------------------------------------------------------------- |
| Unit   | Vitest     | `diff`, `prompts`, `ai-providers`, `streaming`, `editor-detection`, `analytics` |
| E2E    | Playwright | Browser APIs, manifest validation                                               |
| Manual | Chrome     | Full writing flow on Gmail/Notion                                               |

```bash
pnpm test && pnpm test:e2e
```

---

## Architecture

```
  Popup ──────┐
  Side Panel ─┤
  Options ────┤
              ▼
     Background Service Worker
       │              │
  AI Handler    Privacy Filter
  (streaming)   (allowlist, dict)
       │              │
       ▼              ▼
  AI Providers    chrome.storage
  OpenAI/Gemini/
  Anthropic/Nano
       │
       ▼
  Content Script ←── postMessage ──→ Injected Script
  (toolbar,            │              (editor detect,
   highlights)          │               selection track)
                       ▼
                  Editable DOM
```

---

## Message Passing

| Message Type                     | Direction               | Purpose               |
| -------------------------------- | ----------------------- | --------------------- |
| `SELECTION_CHANGED`              | Injected → BG → UI      | Live selection relay  |
| `AI_REQUEST`                     | UI/Content → BG         | Start AI stream       |
| `AI_STREAM_CHUNK`                | BG → Side Panel         | Token-by-token output |
| `AI_STREAM_DONE`                 | BG → Content            | Final text + diff     |
| `AI_ABORT`                       | UI → BG                 | Cancel stream         |
| `APPLY_SUGGESTION`               | UI → Content → Injected | Apply to selection    |
| `GET_SETTINGS` / `SAVE_SETTINGS` | Options ↔ BG            | API keys + privacy    |
| `GET_ANALYTICS`                  | Options → BG            | Usage counters        |

---

## Module Progress

| #   | Module                   | Version | Status  | Key Deliverables                         |
| --- | ------------------------ | ------- | ------- | ---------------------------------------- |
| 1   | Extension Foundation     | v0.1    | ✅      | Monorepo, MV3, CI, all UI surfaces       |
| 2   | Universal Text Detection | v0.2    | ✅      | Shadow DOM, MutationObserver             |
| 3   | Selection & Range Engine | v0.3    | ✅      | Caret rect, selection-aware apply        |
| 4   | LLM Provider Layer       | v0.4    | ✅      | 4 providers + failover                   |
| 5   | Prompt Engineering       | v0.5    | ✅      | 9 action templates                       |
| 6   | Streaming Engine         | v0.6    | ✅      | AbortController + side panel             |
| 7   | Diff Engine              | v0.7    | ⚠️ ~70% | Sentence diff; not Myers/LCS             |
| 8   | Highlight Engine         | v0.8    | ⚠️ ~75% | CSS Highlight + input fallback           |
| 9   | Floating Suggestion UI   | v0.9    | ⚠️ ~60% | Basic toolbar; no undo/shortcuts         |
| 10  | Context Awareness        | v0.9    | ✅      | Hostname-based prompts                   |
| 11  | Privacy                  | v0.9    | ✅      | On-device, allowlist, dictionary masking |
| 12  | Analytics                | v0.9    | ⚠️ ~65% | Counters + weekly report                 |
| 13  | Testing                  | v1.0    | ⚠️ ~60% | Package unit tests; browser-level E2E    |
| 14  | Performance              | v1.0    | ⚠️ ~70% | Debounce + lazy init                     |
| 15  | Publish                  | v1.0    | ⚠️ ~60% | Listing docs; no screenshots             |

**Overall: ~82%** · 7 complete · 8 partial · 0 missing

---

## Privacy & Security

| Control                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| **On-device only**      | Forces Gemini Nano — no cloud API calls                 |
| **Site allowlist**      | Only run on listed hostnames                            |
| **Site blocklist**      | Never run on listed hostnames                           |
| **Personal dictionary** | Words masked as `[PRIVATE]` before AI calls             |
| **Local analytics**     | Counters stored in `chrome.storage` — never transmitted |
| **API keys**            | Stored locally — sent only to chosen provider           |

---

## CI/CD

GitHub Actions on every push/PR to `main`:

`install → generate-icons → lint → typecheck → test → build → e2e`

---

## Browser Support

| Browser      | Status     | Notes                                     |
| ------------ | ---------- | ----------------------------------------- |
| Chrome 120+  | ✅ Primary | Full MV3 + Gemini Nano (Chrome 127+)      |
| Edge 120+    | ✅         | Chromium-based                            |
| Firefox 109+ | ⚠️         | Manifest ready; AI providers need testing |
| Safari       | ❌         | No MV3 extension support                  |

---

## Interview Highlights

- **Isolated world** content script vs **page world** injected script — why both exist
- **Provider adapter pattern** with lazy registration and automatic failover
- `ReadableStream` + `AbortController` for cancellable, low-latency AI streaming
- **CSS Highlight API** vs DOM-mutation underlines — performance + input/textarea limits
- **Privacy-first**: on-device inference, per-site controls, dictionary masking before API calls
- **Sentence-level incremental diff** — reduces AI re-processing by ~80%
- `Intl.Segmenter` for locale-aware sentence boundaries

---

## Remaining Work

- [ ] Myers/LCS diff alignment for accurate change highlighting
- [ ] Full floating UI (undo, explain-why, keyboard shortcuts)
- [ ] Reading level + mistake taxonomy in analytics
- [ ] Extension-loaded Playwright E2E
- [ ] Chrome Web Store screenshots + deployed landing page

---

## Documentation

| Doc                                                     | Description                       |
| ------------------------------------------------------- | --------------------------------- |
| [Architecture](./docs/architecture.md)                  | Message flows, package boundaries |
| [Roadmap](./docs/roadmap.md)                            | 15-module development plan        |
| [Portfolio Overview](../CHROME_EXTENSIONS_PORTFOLIO.md) | All three projects                |

---

## License

Proprietary - All rights reserved.
