# Luonix Ø

Luonix is a browser-based AI Product Studio for researching opportunities and producing editable, sellable digital products.

## Product workflow

- Evidence-led market research across ten query angles, with up to 200 search-result records per run
- Deduplicated source list, domain diversity and selected source excerpts passed into the generation context
- Opportunity brief with evidence, inference, unknowns and a go / revise / reject recommendation
- Product outline and transformation map
- Resumable, section-by-section eBook manuscript generation with a persistent chapter plan and local checkpoints
- Brand kit and sales page
- Editable Markdown source, sanitized preview, Markdown/HTML export, and browser print-to-PDF
- Local project library (up to 10 recent research-heavy projects; compact evidence checkpoints)

## AI providers

The provider registry includes the following OpenAI-compatible or native chat providers:

- Groq
- OpenRouter
- Google AI Studio (Gemini)
- Aion Labs
- Mistral AI
- Z AI
- Kilo Gateway (keyless endpoint)
- LLM7 (keyless endpoint)
- NVIDIA NIM
- ModelScope
- OVHcloud AI Endpoints (anonymous endpoint)
- SiliconFlow
- Gonka Broker
- Cloudflare Workers AI (save credentials as `ACCOUNT_ID|API_TOKEN`)
- OpenAI
- Anthropic

The provider list is based in part on the maintained [awesome-free-llm-apis catalogue](https://github.com/mnfst/awesome-free-llm-apis). It is a directory, not an API itself. Luonix implements provider endpoints and requests model discovery live; a provider being listed does not guarantee that a free model, account, region or quota is available. Cohere's listed trial tier is non-commercial, so it is deliberately not enabled for this commercial-product workflow.

Model IDs are not treated as permanent constants: choose a discovered model or enter an exact model ID manually. Per-stage model overrides can be saved for the opportunity brief, outline, transformation map, full product, brand kit, and sales page.

### Intelligent fallback

The selected provider/model is tried first. If it reports a rate limit, temporary availability error, timeout, unsupported model or server error, Luonix may try other configured providers. Authentication errors stop the fallback chain and are shown with diagnostics. Automatic fallback selects only models flagged as free by provider-specific rules. Mistral, OpenAI and Anthropic are excluded from automatic fallback by default to avoid unexpectedly using metered plans; you can still choose them manually. The registry is maintained in Luonix code and is not automatically synchronized with the catalogue repository.

Luonix does not rotate multiple keys from the same provider to bypass quotas. Provider limits are determined by provider, account, model and plan; adding more keys does not automatically multiply an account's allowance. Free tiers, eligible models, commercial-use permissions and data-use policies can change. Review provider terms before sending customer or confidential material.

## Web research engine

The research route uses Tavily Search. It runs ten targeted searches covering pain points, audience needs, alternatives, negative reviews, pricing and willingness to pay, market evidence, community questions, existing educational products, underserved gaps and case studies.

- Up to 20 results per query (up to 200 result records before URL deduplication)
- Up to 30 top-ranked pages are extracted in full (two batches of at most 15 URLs) and their best evidence is included in the model's research context
- Up to 200 unique source links shown in the research response
- Source IDs such as `[S1]` are used for citations in generated briefs and manuscripts
- Source content is treated as untrusted input; instructions embedded in pages are not followed
- Research is tied to the exact idea so evidence from an old project is not silently reused

A Tavily API key is required. Save it in Settings; it is encrypted locally using the same browser vault. The key is decrypted in the browser and sent to the same-origin research route for the request only. Tavily currently documents 1,000 free API credits per month. Advanced search costs 2 credits per query and basic extraction costs 1 credit per 5 successful URL extractions; a full ten-query run plus 30 successful page extractions is approximately 26 credits. The app displays the actual returned usage when available. Check current pricing and terms before running large research jobs.

## Long-form eBook generation

For eBooks, Luonix first asks a model for a structured book plan, then writes the introduction, core chapters, conclusion and two bonus assets in separate model requests. Each completed section is saved to the local project library. If a request fails or the browser closes, reopen the saved project and run Create Product again to continue from completed sections.

The current target is roughly 900–1,300 words per section across eight core chapters, introduction, conclusion and two bonuses. Actual word count depends on the selected model and its output limits. A generated manuscript can be downloaded as Markdown or HTML, or printed/saved as PDF through the browser print dialog.

## API key security

- API keys are encrypted in this browser using AES-GCM with a key derived from your passphrase using PBKDF2.
- Multiple labelled keys can be saved for each provider.
- The passphrase is not saved. Re-enter it to unlock keys after refreshing.
- For a generation or research request, the browser decrypts the selected key and sends it to the same-origin API route over HTTPS. The route does not persist credentials.
- Never commit keys, put them in source code, or share screenshots that reveal them.

The local vault is a convenience layer, not a substitute for device security. Anyone who can run scripts in the app's origin while the vault is unlocked may be able to misuse a key. Use a unique passphrase and deploy only trusted code over HTTPS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current limitations

- Research can return up to 200 result records, deduplicate them, and attempt full-page extraction on the top 30 pages. It does not read 200 complete books or papers; extraction can fail for blocked, unavailable or unsupported pages, and the app falls back to search excerpts.
- Tavily Search is currently the integrated search provider. Additional search/crawl providers such as Firecrawl or Exa can be added later for independent cross-checking and deeper site crawling.
- The eBook workflow is resumable in browser local storage, not backed by a durable server job queue. Clearing browser storage or changing devices can remove local projects and checkpoints.
- No account authentication, cloud project sync, server-side billing/credits, multi-user rate limiting, image generation, or direct Shopify/Gumroad publishing yet.
- The current PDF export uses the browser print dialog. Markdown and HTML are direct downloads.
- Add authentication, abuse protection, durable job processing and server-side rate limiting before exposing a public multi-user deployment.

## Deploy

Deploy as a Node.js Next.js app (for example, Vercel). Each user supplies their own provider and search credentials through the local vault; no shared provider keys are required as server environment variables.
