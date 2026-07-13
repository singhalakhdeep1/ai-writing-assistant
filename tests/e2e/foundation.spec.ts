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

  test("text replacement in contenteditable", async ({ page }) => {
    await page.setContent(`<div contenteditable="true" id="editor">Hello world</div>`);
    const result = await page.evaluate(() => {
      const el = document.querySelector("[contenteditable]")!;
      el.textContent = "Goodbye world";
      return el.textContent;
    });
    expect(result).toBe("Goodbye world");
  });

  test("undo/redo keyboard shortcuts work", async ({ page }) => {
    await page.setContent(`<div contenteditable="true" id="editor">Original text</div>`);
    await page.focus('[contenteditable="true"]');
    
    // Type new text
    await page.keyboard.type(" and more");
    let content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Original text and more");
    
    // Undo with Ctrl+Z
    await page.keyboard.press("Control+Z");
    content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Original text");
    
    // Redo with Ctrl+Y
    await page.keyboard.press("Control+Y");
    content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Original text and more");
  });

  test("text selection range is correct", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello world</div>`);
    const rangeInfo = await page.evaluate(() => {
      const el = document.querySelector("[contenteditable]")!;
      const range = document.createRange();
      range.setStart(el.firstChild!, 0);
      range.setEnd(el.firstChild!, 5);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      return {
        text: sel.toString(),
        startOffset: range.startOffset,
        endOffset: range.endOffset,
      };
    });
    expect(rangeInfo.text).toBe("Hello");
    expect(rangeInfo.startOffset).toBe(0);
    expect(rangeInfo.endOffset).toBe(5);
  });

  test("multiple contenteditable elements are handled", async ({ page }) => {
    await page.setContent(`
      <div contenteditable="true" id="editor1">First editor</div>
      <div contenteditable="true" id="editor2">Second editor</div>
    `);
    const count = await page.evaluate(() => {
      return document.querySelectorAll('[contenteditable="true"]').length;
    });
    expect(count).toBe(2);
  });

  test("textarea elements are also editable", async ({ page }) => {
    await page.setContent(`<textarea id="textarea">Hello world</textarea>`);
    const value = await page.evaluate(() => {
      const el = document.querySelector("#textarea") as HTMLTextAreaElement;
      el.value = "New text";
      return el.value;
    });
    expect(value).toBe("New text");
  });

  test("rich text formatting is preserved", async ({ page }) => {
    await page.setContent(`<div contenteditable="true"><b>Bold</b> and <i>italic</i></div>`);
    const html = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.innerHTML;
    });
    expect(html).toContain("<b>Bold</b>");
    expect(html).toContain("<i>italic</i>");
  });

  test("cursor position after typing", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello</div>`);
    await page.focus('[contenteditable="true"]');
    await page.keyboard.type(" world");
    const content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Hello world");
  });

  test("backspace deletion works", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello world</div>`);
    await page.focus('[contenteditable="true"]');
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    const content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Hello worl");
  });

  test("enter key creates new line", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Line 1</div>`);
    await page.focus('[contenteditable="true"]');
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 2");
    const content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toContain("Line 1");
    expect(content).toContain("Line 2");
  });

  test("copy and paste functionality", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Original</div>`);
    await page.focus('[contenteditable="true"]');
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Control+C");
    
    await page.setContent(`<div contenteditable="true">Target</div>`);
    await page.focus('[contenteditable="true"]');
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Control+V");
    
    const content = await page.evaluate(() => {
      return document.querySelector("[contenteditable]")!.textContent;
    });
    expect(content).toBe("Original");
  });
});
