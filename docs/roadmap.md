# AI Writing Assistant — Roadmap

> Grammarly-style AI writing assistant Chrome extension with universal editor detection, streaming AI, and privacy-first architecture.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript 5 (strict) |
| Framework | React 19 |
| Build | Vite + CRXJS |
| Monorepo | Turborepo + pnpm |
| UI | Tailwind CSS v4 |
| State | Zustand |
| AI | OpenAI, Gemini, Anthropic, Gemini Nano |
| Testing | Vitest + Playwright |
| CI | GitHub Actions |

**Status:** All 15 modules complete · **Version:** v1.0.0

---

## Phase 1 — Foundation

### Module 1 — Extension Architecture ✅

**Version:** v0.1 · **Duration:** 3 days

| Deliverable | Status |
|-------------|--------|
| Turborepo monorepo | ✅ |
| MV3 manifest | ✅ |
| Background service worker | ✅ |
| Content + injected scripts | ✅ |
| Popup, side panel, options | ✅ |
| Shared packages + messaging | ✅ |
| ESLint, Prettier, Husky, CI | ✅ |

---

### Module 2 — Universal Text Detection ✅

**Version:** v0.2 · **Duration:** 4 days

| Deliverable | Status |
|-------------|--------|
| `@awa/editor-detection` package | ✅ |
| Shadow DOM traversal | ✅ |
| Site-specific selectors (Gmail, Notion, etc.) | ✅ |
| MutationObserver in injected script | ✅ |
| Debounced detection (Module 14) | ✅ |

---

### Module 3 — Selection & Range Engine ✅

**Version:** v0.3 · **Duration:** 4 days

| Deliverable | Status |
|-------------|--------|
| `@awa/selection` package | ✅ |
| selectionchange listener | ✅ |
| Caret rect for floating UI | ✅ |
| Field-to-selection mapping | ✅ |

---

## Phase 2 — AI Engine

### Module 4 — LLM Provider Layer ✅

**Version:** v0.4 · **Package:** `@awa/ai-providers`

| Deliverable | Status |
|-------------|--------|
| OpenAI adapter (streaming SSE) | ✅ |
| Gemini adapter | ✅ |
| Anthropic adapter | ✅ |
| Gemini Nano on-device adapter | ✅ |
| API keys from chrome.storage | ✅ |
| Automatic failover | ✅ |

### Module 5 — Prompt Engineering ✅

**Version:** v0.5 · **Package:** `@awa/prompts`

| Deliverable | Status |
|-------------|--------|
| Grammar, tone, rewrite templates | ✅ |
| Summarize, translate, expand, shorten | ✅ |
| buildPrompt / buildPromptWithContext | ✅ |

### Module 6 — Streaming Engine ✅

**Version:** v0.6 · **Package:** `@awa/streaming`

| Deliverable | Status |
|-------------|--------|
| AbortController cancellation | ✅ |
| ReadableStream processing | ✅ |
| Background streaming relay | ✅ |
| Side panel live rendering | ✅ |

---

## Phase 3 — Suggestion System

### Module 7 — Diff Engine ✅ · `@awa/diff`

| Deliverable | Status |
|-------------|--------|
| Intl.Segmenter sentence splitting | ✅ |
| Sentence-level diff | ✅ |
| Word-level diff for display | ✅ |

### Module 8 — Highlight Engine ✅ · `@awa/highlights`

| Deliverable | Status |
|-------------|--------|
| CSS Highlight API integration | ✅ |
| Error/warning/suggestion severities | ✅ |
| Content script wiring | ✅ |

### Module 9 — Floating Suggestion UI ✅

| Deliverable | Status |
|-------------|--------|
| Shadow DOM floating toolbar | ✅ |
| Quick action buttons | ✅ |
| Caret-positioned placement | ✅ |

---

## Phase 4 — Intelligence

### Module 10 — Context Awareness ✅

| Deliverable | Status |
|-------------|--------|
| Hostname → context mapping | ✅ |
| Email, social, blog, code, resume contexts | ✅ |
| Context injected into system prompts | ✅ |

### Module 11 — Privacy ✅

| Deliverable | Status |
|-------------|--------|
| On-device only mode | ✅ |
| Site allowlist/blocklist | ✅ |
| Personal dictionary | ✅ |
| Options page UI | ✅ |

### Module 12 — Analytics ✅ · `@awa/analytics`

| Deliverable | Status |
|-------------|--------|
| Local-only metrics | ✅ |
| Acceptance rate tracking | ✅ |
| Options page display | ✅ |

---

## Phase 5 — Production

### Module 13 — Testing ✅

| Deliverable | Status |
|-------------|--------|
| Vitest tests for diff, prompts, utils | ✅ |
| Vitest tests for ai-providers, streaming | ✅ |
| Vitest tests for editor-detection | ✅ |

### Module 14 — Performance ✅

| Deliverable | Status |
|-------------|--------|
| Debounced MutationObserver (300ms) | ✅ |
| Lazy provider initialization | ✅ |

### Module 15 — Publish ✅

| Deliverable | Status |
|-------------|--------|
| Chrome Web Store listing (`store/`) | ✅ |
| Privacy policy | ✅ |
| Landing page (`apps/landing/`) | ✅ |
| README + roadmap updated | ✅ |

---

## Git Milestones

| Tag | Module | Status |
|-----|--------|--------|
| v0.1 | Extension foundation | ✅ |
| v0.2 | Editor detection | ✅ |
| v0.3 | Selection engine | ✅ |
| v0.4 | AI providers | ✅ |
| v0.5 | Prompts | ✅ |
| v0.6 | Streaming | ✅ |
| v0.7 | Diff + highlights | ✅ |
| v0.8 | Floating UI | ✅ |
| v0.9 | Privacy + analytics | ✅ |
| v1.0 | Chrome Store release | ✅ |
