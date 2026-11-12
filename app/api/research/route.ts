import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
  published_date?: string;
};

const cleanUrl = (value: string) => {
  try { const u = new URL(value); u.hash = ""; u.search = ""; return u.toString().replace(/\/$/, ""); }
  catch { return value; }
};

const buildQueries = (idea: string, audience: string, problem: string) => {
  const subject = [problem, idea].filter(Boolean).join(" ");
  const who = audience || "people who experience this problem";
  return [
    `"${problem || idea}" pain points complaints frustrations real experiences`,
    `${who} problems needs unmet needs ${idea}`,
    `${idea} solutions alternatives competitors products`,
    `${idea} reviews complaints negative reviews what does not work`,
    `${idea} pricing willingness to pay market demand products`,
    `${idea} industry trends market size statistics research report`,
    `${who} asking for help ${subject} Reddit forums communities`,
    `${idea} beginner mistakes guides courses books templates`,
    `${idea} underserved niche gaps differentiation opportunities`,
    `${problem || idea} case studies outcomes methods evidence`
  ];
};

async function searchOne(query: string, apiKey: string) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ query, topic: "general", search_depth: "advanced", max_results: 20, chunks_per_source: 3, include_answer: false, include_raw_content: true, include_published_date: true, include_usage: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail?.error || data?.detail || data?.message || data?.error || "Tavily search failed (" + response.status + ").");
  return { results: Array.isArray(data.results) ? data.results as TavilyResult[] : [], credits: Number(data.usage?.credits || 2) };
}

async function extractBatch(urls: string[], query: string, apiKey: string) {
  if (!urls.length) return { results: [] as { url: string; raw_content?: string }[], credits: 0 };
  const response = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ urls, query, extract_depth: "basic", format: "markdown", timeout: 12, include_usage: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(18000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail?.error || data?.detail || data?.message || "Tavily extraction failed (" + response.status + ").");
  return { results: Array.isArray(data.results) ? data.results as { url: string; raw_content?: string }[] : [], credits: Number(data.usage?.credits || 0) };
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    const body = await req.json();
    const idea = String(body.idea || "").trim().slice(0, 500);
    const audience = String(body.audience || "").trim().slice(0, 250);
    const problem = String(body.problem || "").trim().slice(0, 400);
    const apiKey = String(body.apiKey || "");
    if (!idea) return NextResponse.json({ error: "Enter a product idea or problem first." }, { status: 400 });
    if (apiKey.length < 8 || apiKey.length > 500) return NextResponse.json({ error: "Add a valid Tavily search API key in Settings." }, { status: 400 });

    const queries = buildQueries(idea, audience, problem);
    const settled: { query: string; results: TavilyResult[]; credits: number; error?: string }[] = [];
    for (let i = 0; i < queries.length; i += 5) {
      const batch = queries.slice(i, i + 5);
      const results = await Promise.all(batch.map(async query => {
        try { const result = await searchOne(query, apiKey); return { query, ...result }; }
        catch (error) { return { query, results: [], credits: 0, error: error instanceof Error ? error.message : "Search failed" }; }
      }));
      settled.push(...results);
    }

    const unique = new Map<string, { source: TavilyResult; query: string }>();
    for (const item of settled) for (const source of item.results) {
      if (!source.url) continue;
      const url = cleanUrl(source.url);
      const existing = unique.get(url);
      if (!existing || (source.score || 0) > (existing.source.score || 0)) unique.set(url, { source: { ...source, url }, query: item.query });
    }
    const ranked = [...unique.values()].sort((a, b) => (b.source.score || 0) - (a.source.score || 0));
    const selected = ranked.slice(0, 30);
    const extracted = new Map<string, string>();
    const extractionErrors: string[] = [];
    let extractionCredits = 0;
    const extractionBatches = [selected.slice(0, 15), selected.slice(15, 30)].filter(batch => batch.length);
    const extractionResults = await Promise.all(extractionBatches.map(async batch => {
      try { return await extractBatch(batch.map(x => x.source.url || "").filter(Boolean), [problem, idea].filter(Boolean).join(" "), apiKey); }
      catch (error) { extractionErrors.push(error instanceof Error ? error.message : "Source extraction failed"); return { results: [], credits: 0 }; }
    }));
    for (const result of extractionResults) {
      extractionCredits += result.credits;
      for (const item of result.results) if (item.url && item.raw_content) extracted.set(cleanUrl(item.url), item.raw_content);
    }
    const sources = ranked.slice(0, 200).map((item, index) => {
      const fullText = extracted.get(cleanUrl(item.source.url || "")) || item.source.raw_content || item.source.content || "";
      return {
        id: "S" + (index + 1),
        title: String(item.source.title || item.source.url || "Untitled source").slice(0, 240),
        url: item.source.url || "",
        domain: (() => { try { return new URL(item.source.url || "").hostname.replace(/^www\./, ""); } catch { return ""; } })(),
        snippet: String(fullText).slice(0, 700),
        publishedDate: item.source.published_date || null,
        relevance: Number(item.source.score || 0),
        extracted: extracted.has(cleanUrl(item.source.url || ""))
      };
    });
    const context = selected.map((item, index) => {
      const url = cleanUrl(item.source.url || "");
      const raw = String(extracted.get(url) || item.source.raw_content || item.source.content || "").replace(/\s+/g, " ").slice(0, 2800);
      return `[S${index + 1}] ${item.source.title || "Untitled"} | ${item.source.url}\nSearch query: ${item.query}\nEvidence: ${raw}`;
    }).join("\n\n---\n\n");
    const successfulQueries = settled.filter(x => !x.error).length;
    const searchCredits = settled.reduce((n, x) => n + x.credits, 0);
    return NextResponse.json({
      idea,
      queries,
      stats: {
        queriesRun: queries.length,
        successfulQueries,
        rawResults: settled.reduce((n, x) => n + x.results.length, 0),
        uniqueSources: ranked.length,
        sourcesIncludedInAnalysis: selected.length,
        pagesExtracted: extracted.size,
        domains: new Set(sources.map(s => s.domain).filter(Boolean)).size,
        searchCredits,
        extractionCredits,
        estimatedCredits: searchCredits + extractionCredits
      },
      sources,
      researchContext: context,
      warnings: [...settled.filter(x => x.error).map(x => x.query + ": " + x.error), ...extractionErrors]
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Research request failed." }, { status: 500 });
  }
}
