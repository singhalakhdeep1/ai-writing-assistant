# AI Writing Assistant — Chrome Web Store Listing

## Short Description (132 chars max)

Grammarly-style AI writing assistant for Gmail, Notion, LinkedIn, and any editable webpage. Privacy-first, multi-provider.

## Detailed Description

AI Writing Assistant brings intelligent writing help to every editable field on the web — just like Grammarly, but with your choice of AI provider.

**Features:**
- Universal editor detection (input, textarea, contenteditable, Shadow DOM)
- Floating toolbar appears when you select text
- Streaming AI suggestions with real-time diff preview
- Multiple AI providers: OpenAI, Google Gemini, Anthropic, Gemini Nano (on-device)
- Context-aware prompts for email, social, blog, code, and resume writing
- CSS Highlight API for zero-DOM-mutation grammar underlines
- Privacy controls: on-device mode, site allowlist/blocklist, personal dictionary
- Local-only analytics — your data never leaves your browser except to your chosen AI provider

**Supported Sites:**
Gmail, Notion, LinkedIn, Slack, GitHub, Reddit, Twitter/X, and any page with editable fields.

**Privacy:**
API keys are stored locally. Analytics are stored locally. No telemetry servers.

## Category

Productivity

## Language

English

## Screenshots

Run `node scripts/capture-screenshots.mjs` to auto-generate all store assets:

| File | Size | Description |
|------|------|-------------|
| `store/screenshots/01-toolbar-gmail.png` | 1280×800 | Floating toolbar on Gmail compose |
| `store/screenshots/02-side-panel-streaming.png` | 1280×800 | Side panel with streaming suggestion |
| `store/screenshots/03-options-providers.png` | 1280×800 | Options page with provider settings |
| `store/screenshots/04-diff-preview.png` | 1280×800 | Diff preview with highlighted changes |
| `store/screenshots/promo-tile-440x280.png` | 440×280 | Small promotional tile |
| `store/screenshots/promo-marquee-1400x560.png` | 1400×560 | Marquee promotional banner |

## Privacy Policy URL

https://ai-writing-assistant.dev/privacy

## Support URL

https://ai-writing-assistant.dev/support

## Version

1.0.0

## Permissions Justification

| Permission | Reason |
|------------|--------|
| storage | Save API keys, settings, and local analytics |
| tabs | Read active tab URL for context-aware prompts |
| activeTab | Interact with the current page's editable fields |
| scripting | Inject editor detection script |
| sidePanel | Show streaming suggestions panel |
| host_permissions (<all_urls>) | Detect editors and assist writing on any site |
