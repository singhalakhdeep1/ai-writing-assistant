import { config } from "@repo/eslint-config/base";

// experimental/ holds standalone clients (cohere, mistral, ollama, perplexity, webllm)
// that are not registered as providers yet; see experimental/README.md.
export default [{ ignores: ["experimental/**"] }, ...config];
