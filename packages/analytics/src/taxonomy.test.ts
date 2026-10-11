import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyEdits,
  getReadingLevelSummary,
  getTopMistakes,
  recordAcceptedEdit,
  generateWeeklyReport,
  getAnalytics,
} from "./index.js";

describe("classifyEdits", () => {
  it("detects spelling fixes", () => {
    expect(classifyEdits("I recieve mail", "I receive mail")).toEqual(["spelling"]);
  });

  it("detects capitalization", () => {
    expect(classifyEdits("i went home", "I went home")).toEqual(["capitalization"]);
  });

  it("detects punctuation changes", () => {
    expect(classifyEdits("Hello world", "Hello, world")).toEqual(["punctuation"]);
  });

  it("detects agreement/confusable errors as grammar", () => {
    expect(classifyEdits("The team have finished", "The team has finished")).toEqual(["grammar"]);
    expect(classifyEdits("their going home", "they're going home")).toEqual(["grammar"]);
  });

  it("detects missing articles", () => {
    expect(classifyEdits("I saw dog", "I saw the dog")).toEqual(["articles-prepositions"]);
  });

  it("classifies multi-word rewrites as word choice", () => {
    expect(classifyEdits("very good", "excellent")).toEqual(["word-choice"]);
  });

  it("returns nothing when text is unchanged", () => {
    expect(classifyEdits("same text", "same text")).toEqual([]);
  });
});

describe("recordAcceptedEdit", () => {
  const store: Record<string, unknown> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async (items: Record<string, unknown>) => {
            Object.assign(store, items);
          },
        },
      },
    });
  });

  it("accumulates mistake taxonomy and reading level", async () => {
    await recordAcceptedEdit("I recieve mail", "I receive mail");
    await recordAcceptedEdit("The team have finished", "The team has finished");

    const snapshot = await getAnalytics();
    expect(snapshot.suggestionsAccepted).toBe(2);
    expect(snapshot.mistakes).toEqual({ spelling: 1, grammar: 1 });
    expect(getTopMistakes(snapshot)).toHaveLength(2);

    const level = getReadingLevelSummary(snapshot);
    expect(level).not.toBeNull();
    expect(typeof level?.gradeAfter).toBe("number");
    expect(generateWeeklyReport(snapshot)).toContain("Top fixes:");
  });

  it("returns null reading level with no data", async () => {
    expect(getReadingLevelSummary(await getAnalytics())).toBeNull();
  });
});
