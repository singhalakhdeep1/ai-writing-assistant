// Cohere client for ai-writing-assistant

export interface CohereConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CohereResponse {
  id: string;
  generations: Array<{
    id: string;
    text: string;
    finish_reason: string;
  }>;
  meta: {
    api_version: {
      version: string;
    };
    billed_units: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export class CohereClient {
  private config: CohereConfig;
  private baseUrl = 'https://api.cohere.ai/v1';

  constructor(config: CohereConfig) {
    this.config = {
      model: 'command',
      temperature: 0.7,
      maxTokens: 1024,
      ...config,
    };
  }

  async generate(prompt: string): Promise<CohereResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Name': 'ai-writing-assistant',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async chat(
    message: string,
    conversationHistory?: Array<{ role: string; message: string }>
  ): Promise<CohereResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Name': 'ai-writing-assistant',
      },
      body: JSON.stringify({
        model: this.config.model,
        message,
        chat_history: conversationHistory,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async streamGenerate(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Name': 'ai-writing-assistant',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.text) onChunk(parsed.text);
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  async rerank(
    query: string,
    documents: string[],
    topN?: number
  ): Promise<Array<{ index: number; relevance_score: number }>> {
    const response = await fetch(`${this.baseUrl}/rerank`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Name': 'ai-writing-assistant',
      },
      body: JSON.stringify({
        model: 'rerank-english-v2.0',
        query,
        documents,
        top_n: topN || documents.length,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.results;
  }
}
