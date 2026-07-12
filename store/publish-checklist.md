# Chrome Web Store Publish Checklist

## Pre-Submission

- [ ] Run `pnpm build` and verify `extension/dist` loads without errors
- [ ] Run `pnpm test` — all unit tests pass
- [ ] Test on Gmail, Notion, LinkedIn, GitHub
- [ ] Verify API keys save/load in Options
- [ ] Verify privacy blocklist blocks AI requests
- [ ] Verify on-device mode does not call cloud APIs
- [ ] Generate icons: `node scripts/generate-icons.mjs`
- [ ] Capture 4+ screenshots (1280×800 or 640×400)
- [ ] Review [listing.md](./listing.md) copy
- [ ] Host privacy policy at public URL

## Submission

- [ ] Zip `extension/dist` or upload via Chrome Developer Dashboard
- [ ] Set category: Productivity
- [ ] Fill permissions justifications from listing.md
- [ ] Submit for review

## Post-Launch

- [ ] Monitor Chrome Web Store reviews
- [ ] Update landing page with store link
- [ ] Tag release: `git tag v1.0.0`
