// WebLLM client for browser-based LLM inference

import * as webllm from '@mlc-ai/web-llm';

export interface WebLLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class WebLLMClient {
  private config: WebLLMConfig;
  private engine: any = null;
  private initialized = false;

  constructor(config: WebLLMConfig = {}) {
    this.config = {
      model: 'Llama-3-8B-Instruct-q4f16_1-MLC',
      temperature: 0.7,
      maxTokens: 1024,
      ...config,
    };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const initProgressCallback = (report: any) => {
      console.log('WebLLM init progress:', report);
    };

    this.engine = await webllm.CreateMLCEngine();
    await this.engine.reload(this.config.model, {
      initProgressCallback,
    });

    this.initialized = true;
  }

  async generate(prompt: string): Promise<string> {
    if (!this.initialized) await this.init();

    const messages = [
      { role: 'user', content: prompt },
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      max_gen_tokens: this.config.maxTokens,
    });

    return reply.choices[0].message.content;
  }

  async chat(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (!this.initialized) await this.init();

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      max_gen_tokens: this.config.maxTokens,
    });

    return reply.choices[0].message.content;
  }

  async streamChat(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.initialized) await this.init();

    const chunks = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      max_gen_tokens: this.config.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) onChunk(content);
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.initialized = false;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }
}
