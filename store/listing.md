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

## Screenshots Needed

1. Floating toolbar on Gmail compose
2. Side panel with streaming suggestion
3. Options page with provider settings
4. Diff preview with highlighted changes

## Promotional Images

- Small tile: 440×280
- Marquee: 1400×560

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
