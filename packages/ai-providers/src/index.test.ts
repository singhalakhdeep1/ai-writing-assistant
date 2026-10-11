import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAvailableProvider, getAllProviders, registerProvider } from "./index.js";
import type { AIProviderAdapter } from "./index.js";

vi.mock("./storage", () => ({
  getProviderKeys: vi.fn().mockResolvedValue({ openai: "test-key" }),
  getPreferredProvider: vi.fn().mockResolvedValue("openai"),
}));

describe("@awa/ai-providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers all built-in providers", () => {
    const providers = getAllProviders();
    expect(providers.length).toBeGreaterThanOrEqual(4);
    expect(providers.map((p) => p.id)).toContain("openai");
    expect(providers.map((p) => p.id)).toContain("gemini");
    expect(providers.map((p) => p.id)).toContain("anthropic");
    expect(providers.map((p) => p.id)).toContain("gemini-nano");
  });

  it("returns available provider with API key", async () => {
    const provider = await getAvailableProvider("openai");
    expect(provider?.id).toBe("openai");
  });

  it("supports custom provider registration", async () => {
    const custom: AIProviderAdapter = {
      id: "openai",
      name: "Custom",
      isAvailable: async () => true,
      stream: async function* () {
        yield "test";
      },
    };
    registerProvider(custom);
    const provider = await getAvailableProvider("openai");
    expect(provider?.name).toBe("Custom");
  });
});
