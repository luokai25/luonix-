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
    if (apiKey) headers.Authorization = "Bearer " + apiKey;
    if (provider === "gemini") headers["x-goog-api-key"] = apiKey || "";
    if (provider === "anthropic") { headers["x-api-key"] = apiKey || ""; headers["anthropic-version"] = "2023-06-01"; }
    const response = await fetch(definition.baseUrl + definition.modelsPath, { headers, cache: "no-store", signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || data?.message || "Model discovery failed.", status: response.status }, { status: response.status });
    const raw = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const models = raw.map((item: any) => {
      const id = String(item.id || item.name || "").replace(/^models\//, "");
      const pricing = item.pricing || {};
      const isFree = provider === "openrouter" && (id.endsWith(":free") || (Number(pricing.prompt) === 0 && Number(pricing.completion) === 0));
      return { id, name: String(item.displayName || item.name || item.id || id), contextLength: Number(item.context_length || item.inputTokenLimit || 0) || null, isFree };
    }).filter((item: { id: string }) => item.id && !/(embedding|moderation|whisper|audio|transcription|guard)/i.test(item.id));
    return NextResponse.json({ provider, name: definition.name, models, checkedAt: new Date().toISOString(), note: definition.note || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Model discovery failed." }, { status: 500 });
  }
}
