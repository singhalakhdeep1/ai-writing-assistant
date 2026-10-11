/**
 * Store Screenshot Capture Script
 *
 * Run with: node scripts/capture-screenshots.mjs
 * Requirements: playwright installed, extension built to extension/dist
 *
 * Generates the 4 required Chrome Web Store screenshots (1280×800) and
 * the promotional tile (440×280) and marquee (1400×560) images.
 *
 * TODO: Replace placeholder HTML with your actual extension pages/popup once built.
 */

import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, "..", "store", "screenshots");
const EXTENSION_DIR = path.join(__dirname, "..", "extension", "dist");

// Ensure output dir exists
import { mkdirSync } from "fs";
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const SCREENSHOT_CONFIGS = [
  {
    name: "01-toolbar-gmail.png",
    description: "Floating toolbar appearing on Gmail compose window",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Writing Assistant — Gmail</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f6f8fc; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .gmail-mock { width: 900px; background: white; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); overflow: hidden; }
    .gmail-header { background: #1a73e8; color: white; padding: 16px 24px; font-size: 15px; font-weight: 500; }
    .compose-area { padding: 24px; min-height: 200px; font-size: 14px; color: #3c4043; border: 1px solid #e0e0e0; margin: 16px; border-radius: 8px; }
    .selected-text { background: #e8f0fe; border-radius: 3px; padding: 1px 0; }
    .awa-toolbar { position: absolute; top: 200px; left: 260px; display: flex; gap: 4px; padding: 6px; background: #1e293b; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
    .awa-btn { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 6px; color: #f1f5f9; font-size: 12px; font-weight: 500; white-space: nowrap; background: rgba(255,255,255,0.05); }
    .awa-btn:first-child { background: #3b82f6; }
    .badge { background: #10b981; color: white; font-size: 10px; padding: 2px 6px; border-radius: 12px; margin-left: 8px; }
  </style>
</head>
<body>
  <div style="position: relative;">
    <div class="gmail-mock">
      <div class="gmail-header">New Message <span class="badge">AI Ready</span></div>
      <div style="padding: 16px 24px;">
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">To: colleague@example.com</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 16px;">Subject: Project Update</div>
        <div class="compose-area" contenteditable="true">
          Hi Sarah,<br><br>
          I wanted to <span class="selected-text">give you a quick update regarding the project status</span>. We have been making 
          significant progress and I believe we are on track to meet the deadline.<br><br>
          Best regards
        </div>
      </div>
    </div>
    <div class="awa-toolbar">
      <button class="awa-btn">✓ Fix Grammar</button>
      <button class="awa-btn">↻ Rewrite</button>
      <button class="awa-btn">◇ Formal</button>
      <button class="awa-btn">… Summarize</button>
      <button style="all:unset;cursor:pointer;padding:6px 8px;color:#94a3b8;font-size:14px;">×</button>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: "02-side-panel-streaming.png",
    description: "Side panel showing a streaming AI suggestion",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Writing Assistant — Side Panel</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #0f172a; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .panel { width: 380px; background: #1e293b; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); padding: 24px; }
    .panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .panel-logo { width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
    .panel-title { font-size: 15px; font-weight: 600; color: #f1f5f9; }
    .section-label { font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .original { background: #0f172a; border-radius: 8px; padding: 12px; font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 16px; }
    .suggestion { background: #0f172a; border-radius: 8px; padding: 12px; font-size: 13px; color: #e2e8f0; line-height: 1.6; border-left: 3px solid #3b82f6; }
    .cursor { display: inline-block; width: 2px; height: 14px; background: #3b82f6; animation: blink 1s infinite; vertical-align: middle; margin-left: 1px; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .action-row { display: flex; gap: 8px; margin-top: 16px; }
    .btn-accept { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; flex: 1; }
    .btn-dismiss { background: #334155; color: #94a3b8; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .streaming-badge { font-size: 10px; color: #3b82f6; margin-left: auto; }
  </style>
</head>
<body>
  <div class="panel">
    <div class="panel-header">
      <div class="panel-logo">AI</div>
      <div class="panel-title">AI Writing Assistant</div>
      <div class="streaming-badge">● Streaming…</div>
    </div>
    <div class="section-label">Original</div>
    <div class="original">give you a quick update regarding the project status</div>
    <div class="section-label">Suggestion (Rewrite — Professional)</div>
    <div class="suggestion">provide you with a comprehensive update on the current project status and progress<span class="cursor"></span></div>
    <div class="action-row">
      <button class="btn-accept">✓ Accept</button>
      <button class="btn-dismiss">Dismiss</button>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: "03-options-providers.png",
    description: "Options page showing AI provider configuration",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Writing Assistant — Options</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; }
    .options-page { max-width: 700px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .options-header { background: linear-gradient(135deg, #1e293b, #334155); padding: 28px 32px; }
    .options-header h1 { color: white; font-size: 20px; font-weight: 700; }
    .options-header p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .options-body { padding: 32px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
    .provider-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .provider-card { border: 2px solid #e2e8f0; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; }
    .provider-card.active { border-color: #3b82f6; background: #eff6ff; }
    .provider-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .provider-desc { font-size: 11px; color: #64748b; margin-top: 2px; }
    .provider-badge { font-size: 10px; background: #dbeafe; color: #3b82f6; padding: 2px 6px; border-radius: 8px; float: right; }
    .input-group { margin-bottom: 12px; }
    .input-group label { display: block; font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 6px; }
    .input-group input { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #1e293b; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .toggle { width: 36px; height: 20px; background: #3b82f6; border-radius: 10px; position: relative; }
    .toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; border-radius: 50%; top: 2px; right: 2px; }
  </style>
</head>
<body>
  <div class="options-page">
    <div class="options-header">
      <h1>AI Writing Assistant — Settings</h1>
      <p>Configure your AI provider and privacy preferences</p>
    </div>
    <div class="options-body">
      <div class="section">
        <h2>AI Provider</h2>
        <div class="provider-grid">
          <div class="provider-card active">
            <span class="provider-badge">Active</span>
            <div class="provider-name">OpenAI</div>
            <div class="provider-desc">GPT-4o, GPT-4-turbo</div>
          </div>
          <div class="provider-card">
            <div class="provider-name">Google Gemini</div>
            <div class="provider-desc">Gemini 1.5 Pro/Flash</div>
          </div>
          <div class="provider-card">
            <div class="provider-name">Anthropic Claude</div>
            <div class="provider-desc">Claude 3.5 Sonnet</div>
          </div>
          <div class="provider-card">
            <span class="provider-badge" style="background:#d1fae5;color:#059669;">On-Device</span>
            <div class="provider-name">Gemini Nano</div>
            <div class="provider-desc">100% private, no API calls</div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>API Key</h2>
        <div class="input-group">
          <label>OpenAI API Key</label>
          <input type="password" value="sk-proj-••••••••••••••••••••••••••••••">
        </div>
      </div>
      <div class="section">
        <h2>Privacy Controls</h2>
        <div class="toggle-row">
          <div>
            <div style="font-size:13px;font-weight:500;color:#1e293b;">Enable on-device mode</div>
            <div style="font-size:11px;color:#64748b;">Never send text to cloud APIs</div>
          </div>
          <div class="toggle" style="background:#e2e8f0;"></div>
        </div>
        <div class="toggle-row">
          <div>
            <div style="font-size:13px;font-weight:500;color:#1e293b;">Local-only analytics</div>
            <div style="font-size:11px;color:#64748b;">Usage stats stay in your browser</div>
          </div>
          <div class="toggle"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: "04-diff-preview.png",
    description: "Diff preview showing highlighted grammar changes",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Writing Assistant — Diff Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .diff-card { width: 760px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); padding: 32px; }
    .diff-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .diff-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; }
    .diff-title { font-size: 16px; font-weight: 600; color: #1e293b; }
    .diff-subtitle { font-size: 12px; color: #64748b; }
    .section { margin-bottom: 20px; }
    .section-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .text-block { font-size: 15px; line-height: 1.7; color: #334155; background: #f8fafc; border-radius: 8px; padding: 16px; }
    .removed { background: #fee2e2; color: #991b1b; text-decoration: line-through; border-radius: 3px; padding: 0 2px; }
    .added { background: #d1fae5; color: #065f46; border-radius: 3px; padding: 0 2px; }
    .unchanged { color: #475569; }
    .action-row { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
    .btn { padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
    .btn-accept { background: #3b82f6; color: white; }
    .btn-reject { background: #f1f5f9; color: #64748b; }
    .legend { display: flex; gap: 16px; font-size: 11px; color: #64748b; margin-top: 12px; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="diff-card">
    <div class="diff-header">
      <div class="diff-icon">✎</div>
      <div>
        <div class="diff-title">Grammar Fix Preview</div>
        <div class="diff-subtitle">Review the suggested changes before accepting</div>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Changes</div>
      <div class="text-block">
        <span class="unchanged">The team </span>
        <span class="removed">have</span>
        <span class="added">has</span>
        <span class="unchanged"> been working </span>
        <span class="removed">very hard on</span>
        <span class="added">diligently on</span>
        <span class="unchanged"> the new features and </span>
        <span class="removed">we believe it</span>
        <span class="added">believes they</span>
        <span class="unchanged"> will be ready </span>
        <span class="removed">by next week</span>
        <span class="added">by the end of next week</span>
        <span class="unchanged">.</span>
      </div>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#fee2e2;"></div> Removed</div>
      <div class="legend-item"><div class="legend-dot" style="background:#d1fae5;"></div> Added</div>
    </div>
    <div class="action-row">
      <button class="btn btn-reject">Reject</button>
      <button class="btn btn-accept">✓ Accept Changes</button>
    </div>
  </div>
</body>
</html>`,
  },
];

const PROMO_CONFIGS = [
  {
    name: "promo-tile-440x280.png",
    width: 440,
    height: 280,
    html: `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); width: 440px; height: 280px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .content { text-align: center; }
    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; }
    h1 { font-size: 22px; font-weight: 800; color: white; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; }
    .providers { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
    .tag { background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 11px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(59,130,246,0.3); }
  </style>
</head>
<body>
  <div class="content">
    <div class="logo">✍</div>
    <h1>AI Writing Assistant</h1>
    <p>Grammar · Rewrite · Tone — on any website</p>
    <div class="providers">
      <span class="tag">OpenAI</span>
      <span class="tag">Gemini</span>
      <span class="tag">Claude</span>
      <span class="tag">On-Device</span>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: "promo-marquee-1400x560.png",
    width: 1400,
    height: 560,
    html: `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2744 100%); width: 1400px; height: 560px; display: flex; align-items: center; padding: 0 80px; overflow: hidden; }
    .left { flex: 1; }
    .logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
    .logo-text { font-size: 18px; font-weight: 700; color: #94a3b8; }
    h1 { font-size: 52px; font-weight: 800; color: white; line-height: 1.1; margin-bottom: 20px; }
    h1 span { background: linear-gradient(90deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sub { font-size: 18px; color: #94a3b8; line-height: 1.5; margin-bottom: 28px; }
    .tags { display: flex; flex-wrap: wrap; gap: 10px; }
    .tag { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #e2e8f0; padding: 8px 16px; border-radius: 24px; font-size: 14px; font-weight: 500; }
    .right { width: 520px; margin-left: 60px; }
    .mock-toolbar { background: #1e293b; border-radius: 12px; padding: 12px; display: flex; gap: 8px; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .mock-btn { background: rgba(255,255,255,0.08); color: #f1f5f9; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; }
    .mock-btn.primary { background: #3b82f6; }
    .mock-diff { background: #1e293b; border-radius: 12px; padding: 20px; font-size: 14px; line-height: 1.8; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .del { background: rgba(239,68,68,0.2); color: #fca5a5; text-decoration: line-through; border-radius: 3px; padding: 0 3px; }
    .ins { background: rgba(34,197,94,0.2); color: #86efac; border-radius: 3px; padding: 0 3px; }
    .same { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="left">
    <div class="logo-row">
      <div class="logo">✍</div>
      <div class="logo-text">AI Writing Assistant</div>
    </div>
    <h1>Write better,<br><span>everywhere.</span></h1>
    <p class="sub">Grammarly-style AI for Gmail, Notion,<br>LinkedIn, and every editable page.</p>
    <div class="tags">
      <span class="tag">✓ Grammar</span>
      <span class="tag">↻ Rewrite</span>
      <span class="tag">◇ Tone</span>
      <span class="tag">… Summarize</span>
      <span class="tag">🔒 Privacy-First</span>
      <span class="tag">⚡ Streaming AI</span>
    </div>
  </div>
  <div class="right">
    <div class="mock-toolbar">
      <div class="mock-btn primary">✓ Fix Grammar</div>
      <div class="mock-btn">↻ Rewrite</div>
      <div class="mock-btn">◇ Formal</div>
      <div class="mock-btn">… Summarize</div>
    </div>
    <div class="mock-diff">
      <span class="same">The team </span>
      <span class="del">have</span>
      <span class="ins">has</span>
      <span class="same"> been working </span>
      <span class="del">on</span>
      <span class="ins">diligently on</span>
      <span class="same"> the new features and believes they will be ready by next week.</span>
    </div>
  </div>
</body>
</html>`,
  },
];

async function captureScreenshots() {
  const browser = await chromium.launch();

  console.log("📸 Capturing Chrome Web Store screenshots...\n");

  // Capture 1280×800 screenshots
  for (const config of SCREENSHOT_CONFIGS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(config.html, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${config.name}`, fullPage: false });
    console.log(`✅ ${config.name} — ${config.description}`);
    await page.close();
  }

  // Capture promotional images
  for (const config of PROMO_CONFIGS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: config.width, height: config.height });
    await page.setContent(config.html, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${config.name}`, fullPage: false });
    console.log(`✅ ${config.name} (${config.width}×${config.height})`);
    await page.close();
  }

  await browser.close();

  console.log(`\n✨ All assets saved to: store/screenshots/`);
  console.log("\nNext steps:");
  console.log("  1. Review the screenshots in store/screenshots/");
  console.log("  2. Upload to Chrome Developer Dashboard");
  console.log("  3. Fill in permissions justifications from store/listing.md");
}

captureScreenshots().catch(console.error);
