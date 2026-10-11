import { describe, expect, it } from "vitest";
import {
  segmentSentences,
  diffSentences,
  getChangedSentences,
  wordDiff,
  myersDiff,
  lcs,
  charDiff,
  wordMyersDiff,
  similarityRatio,
} from "./index.js";

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

  describe("myersDiff", () => {
    const apply = (ops: { type: string; text: string }[]) => ({
      a: ops.filter((o) => o.type !== "insert").map((o) => o.text),
      b: ops.filter((o) => o.type !== "delete").map((o) => o.text),
    });

    it("handles empty inputs", () => {
      expect(myersDiff([], ["a"])).toEqual([{ type: "insert", text: "a" }]);
      expect(myersDiff(["a"], [])).toEqual([{ type: "delete", text: "a" }]);
      expect(myersDiff([], [])).toEqual([]);
    });

    it("returns all equal for identical input", () => {
      const ops = myersDiff(["a", "b", "c"], ["a", "b", "c"]);
      expect(ops.every((o) => o.type === "equal")).toBe(true);
      expect(ops).toHaveLength(3);
    });

    it("produces a minimal edit script that reconstructs both sides", () => {
      const a = "ABCABBA".split("");
      const b = "CBABAC".split("");
      const ops = myersDiff(a, b);
      const edits = ops.filter((o) => o.type !== "equal").length;
      expect(edits).toBe(5); // classic Myers example: D = 5
      const r = apply(ops);
      expect(r.a).toEqual(a);
      expect(r.b).toEqual(b);
    });

    it("diffs words and characters", () => {
      const ops = wordMyersDiff("the quick fox", "the slow fox");
      expect(ops.filter((o) => o.type === "delete").map((o) => o.text)).toEqual(["quick"]);
      expect(ops.filter((o) => o.type === "insert").map((o) => o.text)).toEqual(["slow"]);
      expect(charDiff("abc", "abd").some((o) => o.type === "insert" && o.text === "d")).toBe(true);
    });
  });

  describe("lcs / similarityRatio", () => {
    it("finds the longest common subsequence in order", () => {
      expect(lcs("ABCBDAB".split(""), "BDCABA".split("")).length).toBe(4);
      expect(lcs([1, 2, 3], [4, 5])).toEqual([]);
    });

    it("computes similarity", () => {
      expect(similarityRatio("a b c d", "a b c d")).toBe(1);
      expect(similarityRatio("a b c d", "a b x y")).toBe(0.5);
    });
  });
});
