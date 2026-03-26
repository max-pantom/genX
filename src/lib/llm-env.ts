import type { LLMConfig } from "../types/agent";

export function llmConfigFromEnv(): LLMConfig {
  return {
    endpoint: import.meta.env.VITE_MODEL_ENDPOINT ?? "http://localhost:11434",
    model: import.meta.env.VITE_MODEL_NAME ?? "",
    apiKey: import.meta.env.VITE_MODEL_API ?? "",
  };
}
