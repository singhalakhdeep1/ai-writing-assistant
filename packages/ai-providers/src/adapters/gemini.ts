import type { AIRequest } from "@awa/types";
import { buildPromptWithContext } from "@awa/prompts";
import { parseSSE, getProviderKeys } from "../storage";
import type { AIProviderAdapter } from "../index";

export const geminiAdapter: AIProviderAdapter = {
  id: "gemini",
  name: "Google Gemini",

  async isAvailable() {
    const keys = await getProviderKeys();
    return Boolean(keys.gemini?.trim());
  },

  async *stream(request: AIRequest, signal: AbortSignal) {
    const keys = await getProviderKeys();
    const apiKey = keys.gemini?.trim();
    if (!apiKey) throw new Error("Gemini API key not configured");

    const hostname = request.hostname ?? "unknown";
    const { system, user } = buildPromptWithContext(
      request.action,
      request.text,
      hostname,
      request.customPrompt,
    );

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini error (${response.status}): ${err}`);
    }

    if (!response.body) throw new Error("Gemini returned empty body");

    yield* parseSSE(response.body, signal, (data) => {
      const candidates = data.candidates as
        | Array<{ content?: { parts?: Array<{ text?: string }> } }>
        | undefined;
      return candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    });
  },
};
