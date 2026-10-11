import { describe, expect, it } from "vitest";
import type { ExtensionMessage, AIRequest } from "./index.js";

describe("@awa/types", () => {
  it("ExtensionMessage shape is valid", () => {
    const message: ExtensionMessage = { type: "PING", timestamp: Date.now() };
    expect(message.type).toBe("PING");
  });

  it("AIRequest shape is valid", () => {
    const request: AIRequest = { action: "grammar", text: "hello world" };
    expect(request.action).toBe("grammar");
  });
});
