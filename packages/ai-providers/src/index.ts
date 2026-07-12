import type { AIProvider, AIRequest } from "@awa/types";
import { openaiAdapter } from "./adapters/openai";
import { geminiAdapter } from "./adapters/gemini";
import { anthropicAdapter } from "./adapters/anthropic";
import { geminiNanoAdapter } from "./adapters/gemini-nano";
import { getPreferredProvider } from "./storage";

/** Provider adapter interface (Module 4 — Adapter Pattern). */
export interface AIProviderAdapter {
  id: AIProvider;
  name: string;
  isAvailable(): Promise<boolean>;
  stream(request: AIRequest, signal: AbortSignal): AsyncGenerator<string>;
}

/** Registry of AI provider adapters — lazy initialized. */
const providers = new Map<AIProvider, AIProviderAdapter>();
let initialized = false;

function ensureProvidersRegistered(): void {
  if (initialized) return;
  registerProvider(openaiAdapter);
  registerProvider(geminiAdapter);
  registerProvider(anthropicAdapter);
  registerProvider(geminiNanoAdapter);
  initialized = true;
}

export function registerProvider(adapter: AIProviderAdapter): void {
  providers.set(adapter.id, adapter);
}

export function getProvider(id: AIProvider): AIProviderAdapter | undefined {
  ensureProvidersRegistered();
  return providers.get(id);
}

export function getAllProviders(): AIProviderAdapter[] {
  ensureProvidersRegistered();
  return [...providers.values()];
}

/** Returns the first available provider with automatic failover (Module 4). */
export async function getAvailableProvider(
  preferred?: AIProvider,
): Promise<AIProviderAdapter | null> {
  ensureProvidersRegistered();
  const storedPreferred = (await getPreferredProvider()) as AIProvider | undefined;
  const target = preferred ?? storedPreferred;

  if (target) {
    const adapter = providers.get(target);
    if (adapter && (await adapter.isAvailable())) return adapter;
  }

  for (const adapter of providers.values()) {
    if (await adapter.isAvailable()) return adapter;
  }
  return null;
}

export { openaiAdapter, geminiAdapter, anthropicAdapter, geminiNanoAdapter };
export { getProviderKeys, getPreferredProvider } from "./storage";
