import { test, expect } from "@playwright/test";

test.describe("AI Writing Assistant — E2E", () => {
  test("contenteditable elements are detectable", async ({ page }) => {
    await page.setContent(`<div contenteditable="true" id="editor">Hello world</div>`);
    const found = await page.evaluate(() => {
      return document.querySelectorAll('[contenteditable="true"]').length;
    });
    expect(found).toBe(1);
  });

  test("Selection API works on editable content", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello world</div>`);
  const selected = await page.evaluate(() => {
      const el = document.querySelector("[contenteditable]")!;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      return sel.toString();
    });
    expect(selected).toBe("Hello world");
  });

  test("extension manifest is valid MV3", async () => {
    const manifest = await import("../../extension/manifest.ts");
    expect(manifest.default.manifest_version).toBe(3);
    expect(manifest.default.side_panel?.default_path).toBeTruthy();
  });
});
