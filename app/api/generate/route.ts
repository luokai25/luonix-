import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
type Provider = "openai" | "anthropic" | "gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider as Provider;
    const apiKey = String(body.apiKey || "");
    const model = String(body.model || "");
    const prompt = String(body.prompt || "");
    if (!["openai", "anthropic", "gemini"].includes(provider)) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
    }
    if (!apiKey || apiKey.length < 12 || apiKey.length > 500) {
      return NextResponse.json({ error: "Add a valid provider API key in Settings." }, { status: 400 });
    }
    if (!prompt.trim() || prompt.length > 60000) {
      return NextResponse.json({ error: "Prompt is empty or too long." }, { status: 400 });
    }

    let output = "";
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You are Luonix, a meticulous digital-product creation engine. Produce original, useful, commercially realistic work. Never claim research, facts, citations, files, or actions that you did not actually perform. Use clear headings and concrete deliverables." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "OpenAI request failed." }, { status: response.status });
      output = data.choices?.[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: model || "claude-3-7-sonnet-latest",
          max_tokens: 12000,
          system: "You are Luonix, a meticulous digital-product creation engine. Produce original, useful, commercially realistic work. Never claim research, facts, citations, files, or actions that you did not actually perform. Use clear headings and concrete deliverables.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Anthropic request failed." }, { status: response.status });
      output = (data.content || []).filter((x: { type: string }) => x.type === "text").map((x: { text: string }) => x.text).join("\n");
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || "gemini-2.0-flash")}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "You are Luonix, a meticulous digital-product creation engine. Produce original, useful, commercially realistic work. Never claim research, facts, citations, files, or actions that you did not actually perform.\n\n" + prompt }] }] })
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Gemini request failed." }, { status: response.status });
      output = data.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text || "").join("\n") || "";
    }
    if (!output) return NextResponse.json({ error: "The provider returned an empty response." }, { status: 502 });
    return NextResponse.json({ output });
  } catch {
    return NextResponse.json({ error: "Could not complete the generation request." }, { status: 500 });
  }
}
