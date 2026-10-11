import { describe, expect, it } from "vitest";
import { findTextMatch } from "./index.js";

describe("findTextMatch", () => {
  it("finds a match inside a single node", () => {
    expect(findTextMatch(["Hello brave world"], "brave")).toEqual({
      startNode: 0,
      startOffset: 6,
      endNode: 0,
      endOffset: 11,
    });
  });

  it("maps a match that spans several text nodes", () => {
    // "Hello " | "bra" | "ve world"
    expect(findTextMatch(["Hello ", "bra", "ve world"], "brave")).toEqual({
      startNode: 1,
      startOffset: 0,
      endNode: 2,
      endOffset: 2,
    });
  });

  it("starts in the next node when the match begins at a node boundary", () => {
    expect(findTextMatch(["abc", "def"], "def")).toEqual({
      startNode: 1,
      startOffset: 0,
      endNode: 1,
      endOffset: 3,
    });
  });

  it("returns null for missing or empty search text", () => {
    expect(findTextMatch(["abc"], "xyz")).toBeNull();
    expect(findTextMatch(["abc"], "")).toBeNull();
  });
});
