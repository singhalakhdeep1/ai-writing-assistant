import { describe, expect, it } from "vitest";
import { segmentSentences, diffSentences, getChangedSentences, wordDiff } from "./index";

describe("@awa/diff", () => {
  it("segments text into sentences", () => {
    const sentences = segmentSentences("Hello world. How are you?");
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  it("detects changed sentences", () => {
    const original = "The cat sat on the mat. It was happy.";
    const modified = "The dog sat on the mat. It was happy.";
    const diffs = diffSentences(original, modified);
    expect(diffs.some((d) => d.changed)).toBe(true);
  });

  it("returns only changed sentences", () => {
    const original = "First sentence. Second sentence.";
    const modified = "First sentence. Updated second sentence.";
    const changed = getChangedSentences(original, modified);
    expect(changed.every((c) => c.changed)).toBe(true);
    expect(changed.length).toBeGreaterThan(0);
  });

  it("computes word-level diff", () => {
    const result = wordDiff("the quick fox", "the slow fox");
    expect(result.removed).toContain("quick");
    expect(result.added).toContain("slow");
  });
});
