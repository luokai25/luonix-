import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_BY_ID, type Provider } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    const { provider, apiKey } = await req.json() as { provider: Provider; apiKey?: string };
    const definition = PROVIDER_BY_ID[provider];
    if (!definition || (definition.requiresApiKey && (!apiKey || apiKey.length < 8 || apiKey.length > 500))) {
      return NextResponse.json({ error: "Choose a supported provider and supply its key if required." }, { status: 400 });
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    let token = apiKey || "";
    let baseUrl = definition.baseUrl;
    let modelsPath = definition.modelsPath;
    if (provider === "cloudflare") {
      const split = (apiKey || "").split("|");
      if (split.length < 2 || !split[0] || !split.slice(1).join("|")) return NextResponse.json({ error: "Cloudflare credentials must be ACCOUNT_ID|API_TOKEN." }, { status: 400 });
      baseUrl += "/" + encodeURIComponent(split[0]);
      token = split.slice(1).join("|");
      modelsPath = "/ai/v1/models";
    }
    if (token) headers.Authorization = "Bearer " + token;
    if (provider === "gemini") headers["x-goog-api-key"] = apiKey || "";
    if (provider === "anthropic") { headers["x-api-key"] = apiKey || ""; headers["anthropic-version"] = "2023-06-01"; }
    const response = await fetch(baseUrl + modelsPath, { headers, cache: "no-store", signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || data?.message || "Model discovery failed.", status: response.status }, { status: response.status });
    const raw = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const models = raw.map((item: any) => {
      const id = String(item.id || item.name || "").replace(/^models\\//, "");
      const pricing = item.pricing || {};
      const hasPricing = pricing.prompt !== undefined && pricing.completion !== undefined;
      const zeroPriced = hasPricing && Number(pricing.prompt) === 0 && Number(pricing.completion) === 0;
      const cloudflarePaidModels = new Set([
        "@cf/moonshotai/kimi-k2.6", "@cf/moonshotai/kimi-k2.7-code",
        "@cf/zai-org/glm-5.2", "@cf/zai-org/glm-5.3", "@cf/zai-org/glm-5.3-flash",
        "@cf/deepseek-ai/deepseek-v4-flash-0731", "@cf/deepseek-ai/deepseek-v4-pro-0813"
      ]);
      const isFree =
        zeroPriced ||
        (provider === "openrouter" && id.endsWith(":free")) ||
        (provider === "gemini" && /(gemini-(3\\.[0-9]+-flash|2\\.5-flash)|gemma-4)/i.test(id)) ||
        (provider === "zai" && /glm-(4\\.7-flash|4\\.5-flash|4\\.6v-flash)/i.test(id)) ||
        (provider === "cloudflare" && !cloudflarePaidModels.has(id)) ||
        (provider === "kilo" && (id.endsWith(":free") || id === "kilo-auto/free" || id === "openrouter/free")) ||
        (provider === "llm7" && !/\\bpro\\b/i.test(id)) ||
        ["groq", "aion", "nvidia", "modelscope", "ovh", "gonka"].includes(provider);
      return { id, name: String(item.displayName || item.name || item.id || id), contextLength: Number(item.context_length || item.inputTokenLimit || 0) || null, isFree };
    }).filter((item: { id: string }) => item.id && !/(embedding|moderation|whisper|audio|transcription|guard)/i.test(item.id));
    return NextResponse.json({ provider, name: definition.name, models, checkedAt: new Date().toISOString(), note: definition.note || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Model discovery failed." }, { status: 500 });
  }
}
