export type Provider = "openai" | "anthropic" | "gemini" | "groq" | "openrouter";

export const PROVIDERS: { id: Provider; name: string; defaultModel: string }[] = [
  { id: "openai", name: "OpenAI", defaultModel: "" },
  { id: "anthropic", name: "Anthropic", defaultModel: "" },
  { id: "gemini", name: "Google AI Studio", defaultModel: "" },
  { id: "groq", name: "Groq", defaultModel: "" },
  { id: "openrouter", name: "OpenRouter", defaultModel: "" },
];

export const PROVIDER_ENDPOINTS: Record<Provider, { models: string; chat: string; format: "openai" | "anthropic" | "gemini" }> = {
  openai: { models: "https://api.openai.com/v1/models", chat: "https://api.openai.com/v1/responses", format: "openai" },
  anthropic: { models: "https://api.anthropic.com/v1/models", chat: "https://api.anthropic.com/v1/messages", format: "anthropic" },
  gemini: { models: "https://generativelanguage.googleapis.com/v1beta/models", chat: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", format: "gemini" },
  groq: { models: "https://api.groq.com/openai/v1/models", chat: "https://api.groq.com/openai/v1/chat/completions", format: "openai" },
  openrouter: { models: "https://openrouter.ai/api/v1/models", chat: "https://openrouter.ai/api/v1/chat/completions", format: "openai" },
};

export const SYSTEM_INSTRUCTIONS = "You are Luonix, a meticulous digital-product creation engine. Produce original, useful, commercially realistic work. Never claim research, facts, citations, files, or actions that you did not actually perform. Use clear headings and concrete deliverables.";

export function retryable(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
