import type { AIRequest } from "@awa/types";
import { buildPromptWithContext } from "@awa/prompts";
import { parseSSE, getProviderKeys } from "../storage";
import type { AIProviderAdapter } from "../index";

export const anthropicAdapter: AIProviderAdapter = {
  id: "anthropic",
  name: "Anthropic Claude",

  async isAvailable() {
    const keys = await getProviderKeys();
    return Boolean(keys.anthropic?.trim());
  },

  async *stream(request: AIRequest, signal: AbortSignal) {
    const keys = await getProviderKeys();
    const apiKey = keys.anthropic?.trim();
    if (!apiKey) throw new Error("Anthropic API key not configured");

    const hostname = request.hostname ?? "unknown";
    const { system, user } = buildPromptWithContext(
      request.action,
      request.text,
      hostname,
      request.customPrompt,
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic error (${response.status}): ${err}`);
    }

    if (!response.body) throw new Error("Anthropic returned empty body");

    yield* parseSSE(response.body, signal, (data) => {
      if (data.type !== "content_block_delta") return null;
      const delta = data.delta as { text?: string } | undefined;
      return delta?.text ?? null;
    });
  },
};
