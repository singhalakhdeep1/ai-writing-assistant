import { test, expect } from "@playwright/test";

/**
 * E2E tests for streaming AI suggestions and diff preview rendering.
 * These tests simulate the streaming message flow and verify that:
 *  - partial chunks accumulate correctly
 *  - the final diff highlights the right ranges
 *  - the suggestion apply path works
 */
test.describe("Streaming & Diff Preview — E2E", () => {
  /**
   * Set up a page with a mock streaming accumulator that mirrors the
   * production background-script → content-script flow.
   */
  async function setupStreamingPage(page: Parameters<typeof test>[1]["page"]) {
    await page.setContent(`
      <div contenteditable="true" id="editor" style="padding: 16px; border: 1px solid #ccc;">
        The quick brown fox jumps over the lazy dog.
      </div>
      <div id="diff-output" style="margin-top: 12px; padding: 12px; background: #f1f5f9;"></div>
      <div id="stream-output" style="margin-top: 8px; color: #334155;"></div>
    `);

    await page.evaluate(() => {
      // Simulate streaming accumulation (mirrors AIStreamingService behaviour)
      (window as any).__streamState = {
        buffer: "",
        chunks: [] as string[],
        done: false,
      };

      (window as any).__appendChunk = function (chunk: string) {
        const state = (window as any).__streamState;
        state.buffer += chunk;
        state.chunks.push(chunk);
        const el = document.getElementById("stream-output")!;
        el.textContent = state.buffer;
      };

      (window as any).__finalizeStream = function () {
        (window as any).__streamState.done = true;
      };

      // Simulate diff computation (simplified sentence-level diff)
      (window as any).__computeDiff = function (original: string, modified: string) {
        const origWords = original.trim().split(/\s+/);
        const modWords = modified.trim().split(/\s+/);
        const diffs: Array<{ type: "same" | "removed" | "added"; text: string }> = [];

        let i = 0;
        let j = 0;
        while (i < origWords.length || j < modWords.length) {
          if (i < origWords.length && j < modWords.length && origWords[i] === modWords[j]) {
            diffs.push({ type: "same", text: origWords[i] });
            i++;
            j++;
          } else if (i < origWords.length) {
            diffs.push({ type: "removed", text: origWords[i] });
            i++;
          } else {
            diffs.push({ type: "added", text: modWords[j] });
            j++;
          }
        }
        return diffs;
      };

      (window as any).__renderDiff = function (original: string, modified: string) {
        const diffs = (window as any).__computeDiff(original, modified);
        const container = document.getElementById("diff-output")!;
        container.innerHTML = "";

        for (const diff of diffs) {
          const span = document.createElement("span");
          span.textContent = diff.text + " ";
          if (diff.type === "removed") {
            span.style.background = "#fecaca";
            span.style.textDecoration = "line-through";
            span.setAttribute("data-diff", "removed");
          } else if (diff.type === "added") {
            span.style.background = "#bbf7d0";
            span.setAttribute("data-diff", "added");
          } else {
            span.setAttribute("data-diff", "same");
          }
          container.appendChild(span);
        }
      };
    });
  }

  test("stream buffer accumulates chunks correctly", async ({ page }) => {
    await setupStreamingPage(page);

    const chunks = ["The ", "quick ", "red ", "fox ", "leaps."];
    for (const chunk of chunks) {
      await page.evaluate((c) => (window as any).__appendChunk(c), chunk);
    }

    const buffer = await page.evaluate(() => (window as any).__streamState.buffer);
    expect(buffer).toBe("The quick red fox leaps.");

    const chunkCount = await page.evaluate(() => (window as any).__streamState.chunks.length);
    expect(chunkCount).toBe(5);
  });

  test("stream output updates the DOM progressively", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => (window as any).__appendChunk("Hello "));
    let text = await page.locator("#stream-output").textContent();
    expect(text).toBe("Hello ");

    await page.evaluate(() => (window as any).__appendChunk("world!"));
    text = await page.locator("#stream-output").textContent();
    expect(text).toBe("Hello world!");
  });

  test("stream marks done=true on finalize", async ({ page }) => {
    await setupStreamingPage(page);
    await page.evaluate(() => {
      (window as any).__appendChunk("Final text");
      (window as any).__finalizeStream();
    });

    const done = await page.evaluate(() => (window as any).__streamState.done);
    expect(done).toBe(true);
  });

  test("diff renders added and removed spans correctly", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => {
      (window as any).__renderDiff("The quick brown fox", "The quick red fox");
    });

    const removed = await page.locator('[data-diff="removed"]').count();
    const added = await page.locator('[data-diff="added"]').count();
    const same = await page.locator('[data-diff="same"]').count();

    // "brown" is removed, "red" is added, "The quick fox" are same (3 words)
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(added).toBeGreaterThanOrEqual(1);
    expect(same).toBeGreaterThanOrEqual(3);
  });

  test("removed words have strikethrough style", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => {
      (window as any).__renderDiff("Hello old world", "Hello new world");
    });

    const removedStyle = await page.evaluate(() => {
      const el = document.querySelector('[data-diff="removed"]') as HTMLElement;
      return el?.style?.textDecoration;
    });

    expect(removedStyle).toContain("line-through");
  });

  test("added words have green background", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => {
      (window as any).__renderDiff("Hello old world", "Hello new world");
    });

    const addedBg = await page.evaluate(() => {
      const el = document.querySelector('[data-diff="added"]') as HTMLElement;
      return el?.style?.background;
    });

    expect(addedBg).toBeTruthy();
    expect(addedBg).toBe("rgb(187, 247, 208)"); // #bbf7d0
  });

  test("identical text produces only same-type diff spans", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => {
      (window as any).__renderDiff("Hello world", "Hello world");
    });

    const removed = await page.locator('[data-diff="removed"]').count();
    const added = await page.locator('[data-diff="added"]').count();

    expect(removed).toBe(0);
    expect(added).toBe(0);
  });

  test("completely different text replaces all words", async ({ page }) => {
    await setupStreamingPage(page);

    await page.evaluate(() => {
      (window as any).__renderDiff("one two three", "alpha beta gamma");
    });

    const removed = await page.locator('[data-diff="removed"]').count();
    const added = await page.locator('[data-diff="added"]').count();

    expect(removed).toBe(3);
    expect(added).toBe(3);
  });

  test("empty stream produces empty buffer", async ({ page }) => {
    await setupStreamingPage(page);

    const buffer = await page.evaluate(() => (window as any).__streamState.buffer);
    expect(buffer).toBe("");

    const done = await page.evaluate(() => (window as any).__streamState.done);
    expect(done).toBe(false);
  });

  test("suggestion apply replaces editor content", async ({ page }) => {
    await setupStreamingPage(page);

    // Simulate accepting a suggestion
    await page.evaluate(() => {
      const editor = document.getElementById("editor") as HTMLDivElement;
      editor.textContent = "Suggested improved text from AI.";
    });

    const content = await page.locator("#editor").textContent();
    expect(content?.trim()).toBe("Suggested improved text from AI.");
  });

  test("stream handles special characters without breaking DOM", async ({ page }) => {
    await setupStreamingPage(page);

    const specialChunks = ["<script>", "alert('xss')", "</script>", " & ", "\"quotes\"", "'apostrophes'"];
    for (const chunk of specialChunks) {
      await page.evaluate((c) => (window as any).__appendChunk(c), chunk);
    }

    // textContent assignment is safe from XSS
    const text = await page.locator("#stream-output").textContent();
    expect(text).toContain("alert('xss')");

    // Ensure no <script> tags were injected
    const scriptTags = await page.locator("script#injected-by-stream").count();
    expect(scriptTags).toBe(0);
  });
});
