export type Provider =
  | "openai" | "anthropic" | "gemini" | "groq" | "openrouter"
  | "aion" | "mistral" | "zai" | "kilo" | "llm7"
  | "nvidia" | "modelscope" | "ovh" | "siliconflow";

export type ProviderDefinition = {
  id: Provider;
  name: string;
  baseUrl: string;
  modelsPath: string;
  chatPath: string;
  requiresApiKey: boolean;
  note?: string;
};

export const PROVIDERS: ProviderDefinition[] = [
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true },
  { id: "gemini", name: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true, note: "Review Google's free-tier data-use terms before sending confidential content." },
  { id: "aion", name: "Aion Labs", baseUrl: "https://api.aionlabs.ai/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true },
  { id: "mistral", name: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true, note: "Review free-mode data-use and training opt-out settings." },
  { id: "zai", name: "Z AI", baseUrl: "https://open.bigmodel.cn/api/paas/v4", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true },
  { id: "kilo", name: "Kilo Gateway", baseUrl: "https://api.kilo.ai/api/gateway", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: false },
  { id: "llm7", name: "LLM7", baseUrl: "https://api.llm7.io/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: false },
  { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true },
  { id: "modelscope", name: "ModelScope", baseUrl: "https://api-inference.modelscope.cn/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true, note: "Account binding and identity verification may be required." },
  { id: "ovh", name: "OVHcloud AI Endpoints", baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: false, note: "Anonymous access is heavily rate-limited." },
  { id: "siliconflow", name: "SiliconFlow", baseUrl: "https://api.siliconflow.cn/v1", modelsPath: "/models", chatPath: "/chat/completions", requiresApiKey: true, note: "Identity verification may be required." },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", modelsPath: "/models", chatPath: "/responses", requiresApiKey: true },
  { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", modelsPath: "/models", chatPath: "/messages", requiresApiKey: true },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map(p => [p.id, p])) as Record<Provider, ProviderDefinition>;

export const SYSTEM_INSTRUCTIONS = "You are Luonix, a meticulous digital-product creation engine. Produce original, useful, commercially realistic work. Never claim research, facts, citations, files, or actions that you did not actually perform. Use clear headings and concrete deliverables.";

export function retryable(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
