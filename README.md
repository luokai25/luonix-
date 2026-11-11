# Luonix Ø

Luonix is a browser-based AI Product Studio for turning ideas into structured, editable digital products.

## Product workflow

- Opportunity brief and validation plan
- Product outline and transformation map
- Full digital-product generation
- Brand kit and sales page
- Editable Markdown source, sanitized preview, Markdown/HTML export, and browser print-to-PDF
- Local project library (up to 30 recent projects)

## AI providers

The app currently supports bring-your-own-key connections for:

- OpenAI
- Anthropic
- Google AI Studio (Gemini)
- Groq
- OpenRouter

Model discovery is requested live from each provider's model endpoint. Model IDs are not treated as permanent constants: choose a discovered model or enter an exact model ID manually. The default provider order prioritizes Groq, OpenRouter, and Google AI Studio. The [awesome-free-llm-apis catalogue](https://github.com/mnfst/awesome-free-llm-apis) can help discover more providers, but the catalogue itself is not an API endpoint.

### Intelligent fallback

The selected provider/model is tried first. If the provider reports a rate limit, temporary availability error, timeout, or server error, Luonix may try the other providers for which you have saved keys and can discover an available model. Authentication and other non-retryable errors stop the fallback chain and are shown with provider diagnostics.

Luonix does not rotate multiple keys from the same provider to bypass quotas. Provider limits are determined by the provider, account, model, and plan; adding more keys does not automatically multiply an account's allowance. Free tiers, eligible models, commercial-use permissions, and data-use policies can change; check the provider's current terms before using customer or confidential material. Rate-limit responses are surfaced in the generation status and error details.

## API key security

- API keys are encrypted in this browser using AES-GCM with a key derived from your passphrase using PBKDF2.
- You can save multiple labelled keys for each provider and choose which one is active.
- The passphrase is not saved. Re-enter it to unlock keys after refreshing.
- For a generation request, the browser decrypts the selected key(s) and sends them to the same-origin API route over HTTPS. The route forwards requests and does not persist credentials.
- Never commit keys, put them in source code, or share screenshots that reveal them.

The local vault is a convenience layer, not a substitute for device security. Anyone who can run scripts in the app's origin while the vault is unlocked may be able to misuse a key. Use a unique passphrase and deploy only trusted code over HTTPS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current limitations

- Live model discovery is supported for the listed providers, but availability and model capabilities are provider-account dependent.
- Model discovery does not reveal reliable remaining quota for every provider. Luonix reports rate-limit events rather than inventing quota numbers.
- No live market research, image generation, cloud project sync, user authentication, multi-user rate limiting, or direct Shopify/Gumroad publishing yet.
- Add authentication, abuse protection, and server-side rate limiting before exposing a public multi-user deployment.

## Deploy

Deploy as a Node.js Next.js app (for example, Vercel). Each user supplies their own provider credentials through the local vault; no shared provider keys are required as server environment variables.
