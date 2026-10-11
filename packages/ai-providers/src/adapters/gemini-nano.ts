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

function getLanguageModel(): LanguageModelFactory | undefined {
  return (globalThis as { LanguageModel?: LanguageModelFactory }).LanguageModel;
}

/** On-device Gemini Nano adapter (Module 4 & 11). */
export const geminiNanoAdapter: AIProviderAdapter = {
  id: "gemini-nano",
  name: "Gemini Nano (On-Device)",

  async isAvailable() {
    const languageModel = getLanguageModel();
    if (!languageModel) return false;
    try {
      const caps = await languageModel.capabilities();
      return caps.available !== "no";
    } catch {
      return false;
    }
  },

  async *stream(request: AIRequest, signal: AbortSignal) {
    const languageModel = getLanguageModel();
    if (!languageModel) {
      throw new Error("On-device LanguageModel API is not available");
    }

    const hostname = request.hostname ?? "unknown";
    const { system, user } = buildPromptWithContext(
      request.action,
      request.text,
      hostname,
      request.customPrompt,
    );

    const session = await languageModel.create({ systemPrompt: system });
    const stream = await session.promptStreaming(user);

    for await (const chunk of stream) {
      if (signal.aborted) break;
      if (chunk.text) yield chunk.text;
    }
  },
};
