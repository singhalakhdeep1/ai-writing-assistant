import { describe, expect, it } from "vitest";
import { createStreamRequest, abortStream, completeStream, getActiveStreamCount } from "./index";

describe("@awa/streaming", () => {
  it("creates and tracks stream requests", () => {
    const request = createStreamRequest();
    expect(request.id).toBeTruthy();
    expect(getActiveStreamCount()).toBe(1);
    completeStream(request.id);
    expect(getActiveStreamCount()).toBe(0);
  });

  it("aborts active streams", () => {
    const request = createStreamRequest();
    expect(abortStream(request.id)).toBe(true);
    expect(getActiveStreamCount()).toBe(0);
  });

  it("returns false for unknown stream id", () => {
    expect(abortStream("nonexistent")).toBe(false);
  });
});
