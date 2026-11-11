# Luonix Ø

Luonix is a browser-based AI Product Studio for turning ideas into structured digital products.

## Included in this foundation
- Guided product brief, outline, transformation map, full-product generation, brand kit, and sales-page workflow.
- Bring-your-own-key routing for OpenAI, Anthropic, and Google Gemini.
- Device-local AES-GCM encrypted API-key vault using Web Crypto and a passphrase-derived key.
- Editable Markdown source, sanitized rich preview, Markdown/HTML downloads, and browser print-to-PDF.
- Local project library stored in the browser (up to 30 recent generated projects).
- GitHub Actions validation and production build.

## Stack
- Next.js App Router + TypeScript
- OpenAI Responses API
- Anthropic Messages API
- Google Gemini generateContent API
- IndexedDB + Web Crypto for encrypted provider keys
- localStorage for non-secret project drafts

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Configure provider keys
Open **Settings**, choose a provider, enter a vault passphrase of at least 10 characters, paste the API key, and choose **Encrypt & save**. The secret is encrypted in this browser. The passphrase is not saved. Re-enter it after refreshing the app to unlock the saved key.

For each generation, the browser decrypts the selected key and sends it to the same-origin API route over HTTPS. The route forwards the request to the selected provider and does not persist the key. Never commit API keys, put them in source code, or share screenshots that reveal them.

The local vault is a convenience layer, not a substitute for device security. Anyone who can run scripts in the app's origin while the vault is unlocked may be able to misuse a key. Use a unique passphrase and deploy only trusted code over HTTPS.

## Current scope and next integrations
The product brief creates structured opportunity hypotheses and a validation plan; it does not perform independent live web research yet. Image generation, cloud project sync, user authentication, multi-user rate limiting, and direct publishing to Shopify/Gumroad are not included in this foundation. Add authentication and server-side rate limiting before exposing a public multi-user deployment.

## Deploy
Deploy as a Node.js Next.js app (for example, Vercel). Provider secrets are supplied by each user through the local vault, so no shared provider keys are required as server environment variables.
