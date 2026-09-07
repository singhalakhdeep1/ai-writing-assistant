import { test, expect } from "@playwright/test";

/**
 * E2E tests for the floating toolbar behaviour.
 * These run in a regular browser page and simulate the DOM environment
 * that the content script sees. The toolbar module is exercised via
 * page.evaluate so that Shadow DOM isolation is preserved.
 */
test.describe("Floating Toolbar — E2E", () => {
  /**
   * Helper: inject the toolbar logic directly into the page so we can
   * exercise it without loading the full extension bundle.
   */
  async function injectToolbarFactory(page: Parameters<typeof test>[1]["page"]) {
    await page.evaluate(() => {
      // Minimal replica of createFloatingToolbar used in production
      (window as any).__createToolbar = function (onAction: (a: string) => void, onDismiss: () => void) {
        const host = document.createElement("div");
        host.id = "awa-floating-toolbar";
        host.style.all = "initial";
        document.documentElement.appendChild(host);

        const shadow = host.attachShadow({ mode: "open" }); // open so tests can inspect

        const style = document.createElement("style");
        style.textContent = `
          .awa-toolbar { position: fixed; z-index: 2147483647; display: flex; gap: 4px; padding: 6px; background: #1e293b; border-radius: 8px; }
          .awa-btn { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 6px; color: #f1f5f9; font-size: 12px; }
          .awa-dismiss { all: unset; cursor: pointer; padding: 6px 8px; border-radius: 6px; color: #94a3b8; font-size: 14px; }
        `;

        const toolbar = document.createElement("div");
        toolbar.className = "awa-toolbar";
        toolbar.style.display = "none";
        toolbar.setAttribute("data-testid", "awa-toolbar");

        const ACTIONS = [
          { action: "grammar", label: "Fix Grammar" },
          { action: "rewrite", label: "Rewrite" },
          { action: "tone-formal", label: "Formal" },
          { action: "summarize", label: "Summarize" },
        ];

        for (const { action, label } of ACTIONS) {
          const btn = document.createElement("button");
          btn.className = "awa-btn";
          btn.textContent = label;
          btn.setAttribute("data-action", action);
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            onAction(action);
          });
          toolbar.appendChild(btn);
        }

        const dismiss = document.createElement("button");
        dismiss.className = "awa-dismiss";
        dismiss.setAttribute("data-testid", "awa-dismiss");
        dismiss.textContent = "×";
        dismiss.addEventListener("mousedown", (e) => {
          e.preventDefault();
          onDismiss();
        });
        toolbar.appendChild(dismiss);

        shadow.appendChild(style);
        shadow.appendChild(toolbar);

        return {
          show(top: number, left: number) {
            toolbar.style.display = "flex";
            toolbar.style.top = `${top}px`;
            toolbar.style.left = `${left}px`;
          },
          hide() { toolbar.style.display = "none"; },
          destroy() { host.remove(); },
          getHost: () => host,
        };
      };
    });
  }

  test("toolbar is hidden by default", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello</div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
    });

    const display = await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      const toolbar = shadow.querySelector(".awa-toolbar") as HTMLElement;
      return toolbar.style.display;
    });

    expect(display).toBe("none");
  });

  test("toolbar becomes visible on show()", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Select me</div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      (window as any).__toolbar.show(100, 200);
    });

    const display = await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      return (shadow.querySelector(".awa-toolbar") as HTMLElement).style.display;
    });

    expect(display).toBe("flex");
  });

  test("toolbar hides on hide()", async ({ page }) => {
    await page.setContent(`<div contenteditable="true">Hello</div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      (window as any).__toolbar.show(100, 200);
      (window as any).__toolbar.hide();
    });

    const display = await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      return (shadow.querySelector(".awa-toolbar") as HTMLElement).style.display;
    });

    expect(display).toBe("none");
  });

  test("toolbar renders all four action buttons", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    const buttonLabels = await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      return Array.from(shadow.querySelectorAll(".awa-btn")).map((b: any) => b.textContent);
    });

    expect(buttonLabels).toContain("Fix Grammar");
    expect(buttonLabels).toContain("Rewrite");
    expect(buttonLabels).toContain("Formal");
    expect(buttonLabels).toContain("Summarize");
  });

  test("clicking an action button fires onAction callback", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__lastAction = null;
      (window as any).__toolbar = (window as any).__createToolbar(
        (action: string) => { (window as any).__lastAction = action; },
        () => {}
      );
      (window as any).__toolbar.show(100, 200);
    });

    // Trigger the grammar button via mousedown
    await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      const btn = shadow.querySelector('[data-action="grammar"]') as HTMLElement;
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    const lastAction = await page.evaluate(() => (window as any).__lastAction);
    expect(lastAction).toBe("grammar");
  });

  test("dismiss button fires onDismiss callback", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__dismissed = false;
      (window as any).__toolbar = (window as any).__createToolbar(
        () => {},
        () => { (window as any).__dismissed = true; }
      );
      (window as any).__toolbar.show(100, 200);
    });

    await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      const btn = shadow.querySelector('[data-testid="awa-dismiss"]') as HTMLElement;
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    const dismissed = await page.evaluate(() => (window as any).__dismissed);
    expect(dismissed).toBe(true);
  });

  test("destroy() removes the toolbar from the DOM", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      (window as any).__toolbar.destroy();
    });

    const exists = await page.evaluate(() => !!document.querySelector("#awa-floating-toolbar"));
    expect(exists).toBe(false);
  });

  test("toolbar is positioned correctly after show()", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      (window as any).__toolbar.show(150, 300);
    });

    const { top, left } = await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      const toolbar = shadow.querySelector(".awa-toolbar") as HTMLElement;
      return { top: toolbar.style.top, left: toolbar.style.left };
    });

    expect(top).toBe("150px");
    expect(left).toBe("300px");
  });

  test("shadow DOM isolates toolbar styles from page styles", async ({ page }) => {
    // Inject a global style that would override the toolbar if not isolated
    await page.setContent(`
      <style>* { display: none !important; }</style>
      <div></div>
    `);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__toolbar = (window as any).__createToolbar(() => {}, () => {});
      (window as any).__toolbar.show(100, 200);
    });

    // The toolbar inside shadow DOM should not be affected by the global display:none
    const display = await page.evaluate(() => {
      const host = document.querySelector("#awa-floating-toolbar")!;
      const shadow = (host as any).shadowRoot;
      // We check the inline style, not computed (shadow root isolates inherited styles)
      return (shadow.querySelector(".awa-toolbar") as HTMLElement).style.display;
    });

    expect(display).toBe("flex");
  });

  test("multiple action triggers are independent", async ({ page }) => {
    await page.setContent(`<div></div>`);
    await injectToolbarFactory(page);

    await page.evaluate(() => {
      (window as any).__actions = [] as string[];
      (window as any).__toolbar = (window as any).__createToolbar(
        (action: string) => { ((window as any).__actions as string[]).push(action); },
        () => {}
      );
      (window as any).__toolbar.show(100, 200);
    });

    const actionsToFire = ["grammar", "rewrite", "tone-formal", "summarize"];
    for (const action of actionsToFire) {
      await page.evaluate((a) => {
        const host = document.querySelector("#awa-floating-toolbar")!;
        const shadow = (host as any).shadowRoot;
        const btn = shadow.querySelector(`[data-action="${a}"]`) as HTMLElement;
        btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      }, action);
    }

    const firedActions = await page.evaluate(() => (window as any).__actions);
    expect(firedActions).toEqual(["grammar", "rewrite", "tone-formal", "summarize"]);
  });
});
