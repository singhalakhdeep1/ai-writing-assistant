import type { AIRequest } from "@awa/types";
import { buildPromptWithContext } from "@awa/prompts";
import { parseSSE, getProviderKeys } from "../storage";
import type { AIProviderAdapter } from "../index";

export const openaiAdapter: AIProviderAdapter = {
  id: "openai",
  name: "OpenAI",

  async isAvailable() {
    const keys = await getProviderKeys();
    return Boolean(keys.openai?.trim());
  },

  async *stream(request: AIRequest, signal: AbortSignal) {
    const keys = await getProviderKeys();
    const apiKey = keys.openai?.trim();
    if (!apiKey) throw new Error("OpenAI API key not configured");

    const hostname = request.hostname ?? "unknown";
    const { system, user } = buildPromptWithContext(
      request.action,
      request.text,
      hostname,
      request.customPrompt,
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${err}`);
    }

    if (!response.body) throw new Error("OpenAI returned empty body");

    yield* parseSSE(response.body, signal, (data) => {
      const choices = data.choices as Array<{ delta?: { content?: string } }> | undefined;
      return choices?.[0]?.delta?.content ?? null;
    });
  },
};
