import type { AIRequest } from "@awa/types";
import { buildPromptWithContext } from "@awa/prompts";
import type { AIProviderAdapter } from "../index";

interface LanguageModelSession {
  promptStreaming(prompt: string): Promise<AsyncIterable<{ text: string }>>;
}

interface LanguageModelFactory {
  create(options: { systemPrompt?: string }): Promise<LanguageModelSession>;
  capabilities(): Promise<{ available: string }>;
}

declare global {
  interface Window {
    LanguageModel?: LanguageModelFactory;
  }
}

/** On-device Gemini Nano adapter (Module 4 & 11). */
export const geminiNanoAdapter: AIProviderAdapter = {
  id: "gemini-nano",
  name: "Gemini Nano (On-Device)",

  async isAvailable() {
    if (typeof LanguageModel === "undefined") return false;
    try {
      const caps = await LanguageModel.capabilities();
      return caps.available !== "no";
    } catch {
      return false;
    }
  },

  async *stream(request: AIRequest, signal: AbortSignal) {
    if (typeof LanguageModel === "undefined") {
      throw new Error("On-device LanguageModel API is not available");
    }

    const hostname = request.hostname ?? "unknown";
    const { system, user } = buildPromptWithContext(
      request.action,
      request.text,
      hostname,
      request.customPrompt,
    );

    const session = await LanguageModel.create({ systemPrompt: system });
    const stream = await session.promptStreaming(user);

    for await (const chunk of stream) {
      if (signal.aborted) break;
      if (chunk.text) yield chunk.text;
    }
  },
};
