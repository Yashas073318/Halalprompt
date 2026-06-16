---
name: add-provider
description: Add a new BYOK LLM provider (or change a default model) to halalprompt. Use when the user wants to support another provider alongside Anthropic/OpenAI, or swap a default model. The provider registry is split client/server for the trust boundary, so this is a small, exact, two-file change that must stay in sync — this skill lists every touch point.
---

# Add an LLM provider

Providers are defined twice on purpose: the **server** factory (`server/providers.ts`) holds the
SDK calls and never reaches the browser; the **client** registry (`src/llm/providers.ts`) is bundled
to the browser and must stay secret-free. They must agree on `ProviderId` and default models.

## Steps

1. **`server/providers.ts`** —
   - extend the `ProviderId` union with the new id;
   - add a `DEFAULT_MODEL[id]` entry;
   - add a `case '<id>':` in `buildModel()` that returns the per-request factory (e.g.
     `createX({ apiKey })(model)`);
   - update `isProviderId()` to accept it.
   - The factory must take the key **per call** — never read it from `process.env` or cache it.
2. **`src/llm/providers.ts`** — add a `PROVIDERS['<id>']` entry: `id`, `label`, `defaultModel` (same
   string as the server default), `keyHint`. No SDK imports, no secrets here.
3. **Install the SDK** if needed (`@ai-sdk/<provider>`), and import it only in `server/providers.ts`.
4. **Verify:** `npm run verify` (`tsc -b` catches a missing switch case / type mismatch). Optionally
   have the `trust-boundary-reviewer` agent confirm the client file stayed secret-free.

## Changing only a default model

Edit `DEFAULT_MODEL` in `server/providers.ts` and the matching `defaultModel` in
`src/llm/providers.ts` — both, identically. The system prompt and `maxTokens` live in
`server/app.ts` (`SYSTEM_PROMPT`, `streamText`).

## Don't

- Don't let the two registries drift (id or default model) — BYOK requests fail if the client sends
  an `x-llm-provider` the server doesn't know.
- Don't import `@ai-sdk/*` or read env vars in any `src/` file.
