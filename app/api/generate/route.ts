import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_BY_ID, retryable, SYSTEM_INSTRUCTIONS, type Provider } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

type Candidate = { provider: Provider; apiKey?: string; model: string };

async function callCandidate(candidate: Candidate, prompt: string) {
  const definition = PROVIDER_BY_ID[candidate.provider];
  if (!definition) return { ok: false as const, status: 400, error: "Unknown provider." };
  const { provider, apiKey, model } = candidate;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (apiKey) headers.Authorization = "Bearer " + apiKey;
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey || "";
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "false";
  }
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://luonix.app";
    headers["X-Title"] = "Luonix";
  }
  const url = definition.baseUrl + definition.chatPath;
  let payload: Record<string, unknown>;
  if (provider === "openai") {
    payload = { model, instructions: SYSTEM_INSTRUCTIONS, input: prompt, max_output_tokens: 16000 };
  } else if (provider === "anthropic") {
    payload = { model, max_tokens: 16000, system: SYSTEM_INSTRUCTIONS, messages: [{ role: "user", content: prompt }] };
  } else {
    payload = { model, messages: [{ role: "system", content: SYSTEM_INSTRUCTIONS }, { role: "user", content: prompt }], max_tokens: 16000, temperature: 0.65 };
  }
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(55000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error?.message || data?.message || data?.detail || "Provider request failed.";
    return { ok: false as const, status: response.status, error: String(error).slice(0, 400) };
  }
  let output = "";
  if (provider === "openai") {
    output = data.output_text || (data.output || []).flatMap((item: { content?: { type: string; text?: string }[] }) => (item.content || []).filter(part => part.type === "output_text").map(part => part.text || "")).join("\n");
  } else if (provider === "anthropic") {
    output = (data.content || []).filter((x: { type: string }) => x.type === "text").map((x: { text: string }) => x.text).join("\n");
  } else {
    const content = data.choices?.[0]?.message?.content;
    output = typeof content === "string" ? content : Array.isArray(content) ? content.map((x: { text?: string }) => x.text || "").join("\n") : "";
  }
  if (!output) return { ok: false as const, status: 502, error: "The provider returned an empty response." };
  return { ok: true as const, output };
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    const body = await req.json();
    const prompt = String(body.prompt || "");
    const candidates = (Array.isArray(body.candidates) ? body.candidates : [{ provider: body.provider, apiKey: body.apiKey, model: body.model }]) as Candidate[];
    if (!prompt.trim() || prompt.length > 100000) return NextResponse.json({ error: "Prompt is empty or too long." }, { status: 400 });
    if (!candidates.length || candidates.length > 8) return NextResponse.json({ error: "Choose one to eight provider candidates." }, { status: 400 });
    const attempts: { provider: string; model: string; status: number; error: string }[] = [];
    for (const candidate of candidates) {
      const definition = candidate?.provider ? PROVIDER_BY_ID[candidate.provider] : undefined;
      if (!definition || (definition.requiresApiKey && (!candidate.apiKey || candidate.apiKey.length < 8 || candidate.apiKey.length > 500)) || !candidate.model) continue;
      try {
        const result = await callCandidate(candidate, prompt);
        if (result.ok) return NextResponse.json({ output: result.output, provider: candidate.provider, model: candidate.model, fallbackUsed: attempts.length > 0, attempts });
        attempts.push({ provider: candidate.provider, model: candidate.model, status: result.status, error: result.error });
        if (!retryable(result.status)) break;
      } catch (error) {
        attempts.push({ provider: candidate.provider, model: candidate.model, status: 0, error: error instanceof Error ? error.message : "Network error" });
      }
    }
    const last = attempts[attempts.length - 1];
    return NextResponse.json({ error: last?.error || "No usable provider candidate was supplied.", attempts }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "Could not complete the generation request." }, { status: 500 });
  }
}
