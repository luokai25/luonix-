# Luonix Ø

Luonix is a browser-based AI Product Studio. It turns product ideas into structured digital products with a BYOK provider router, encrypted local API-key vault, editable preview, and export tools.

## Stack
- Next.js App Router + TypeScript
- OpenAI, Anthropic, and Google Gemini provider adapters
- Device-local AES-GCM encrypted API-key vault (keys are never committed or persisted by the server)
- Server-side generation proxy with request validation

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## API keys
Open Settings, set a vault passphrase, add a provider key, and save it. The vault is encrypted in this browser using Web Crypto. The key is decrypted only for a generation request and is not stored by the API route. Use HTTPS in production. Protect the app origin against XSS and do not deploy untrusted scripts alongside it.

## Deploy
Deploy as a Node.js Next.js app (for example, Vercel). No provider secrets are required as server environment variables because Luonix uses bring-your-own-key. Add rate limiting/authentication before exposing a multi-user public deployment.
