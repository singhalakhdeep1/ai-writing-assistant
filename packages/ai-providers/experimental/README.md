# Experimental provider clients

Standalone REST/SDK clients for Cohere, Mistral, Ollama, Perplexity and WebLLM.
They are **not** registered in the provider registry, not part of `AIProvider`, and not
compiled or linted (they live outside `src/`). To promote one: implement
`AIProviderAdapter` (see `src/adapters/openai.ts`), add its id to `AIProvider` in
`@awa/types`, a key field to `ProviderKeys`, a row in the Options page, and its API host to
`host_permissions` if needed. `webllm` additionally needs the `@mlc-ai/web-llm` dependency.
