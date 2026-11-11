import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENDPOINTS, type Provider } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    const { provider, apiKey } = await req.json() as { provider: Provider; apiKey: string };
    if (!apiKey || apiKey.length < 12 || apiKey.length > 500 || !(provider in PROVIDER_ENDPOINTS)) {
      return NextResponse.json({ error: "Choose a supported provider and enter a valid API key." }, { status: 400 });
    }
    const endpoint = PROVIDER_ENDPOINTS[provider].models;
    const headers: Record<string, string> = { Accept: "application/json" };
    let url = endpoint;
    if (provider === "gemini") headers["x-goog-api-key"] = apiKey;
    else if (provider === "anthropic") { headers["x-api-key"] = apiKey; headers["anthropic-version"] = "2023-06-01"; }
    else headers.Authorization = "Bearer " + apiKey;
    const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Model discovery failed.", status: response.status }, { status: response.status });
    const raw = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const models = raw.map((item: any) => {
      const id = String(item.id || item.name || "").replace(/^models\\//, "");
      const pricing = item.pricing || {};
      const isFree = provider === "openrouter" && (id.endsWith(":free") || (Number(pricing.prompt) === 0 && Number(pricing.completion) === 0));
      return { id, name: String(item.displayName || item.name || item.id || id), contextLength: Number(item.context_length || item.inputTokenLimit || 0) || null, isFree };
    }).filter((item: { id: string }) => item.id && !/(embedding|moderation|whisper|audio|transcription|guard)/i.test(item.id));
    return NextResponse.json({ provider, models, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Model discovery failed." }, { status: 500 });
  }
}
