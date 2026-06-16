# Backend (`server/`) — Claude context

Scoped context for the Hono API. Auto-loaded when you work under `server/`. The root `CLAUDE.md`
is the project hub; the React client lives in `src/CLAUDE.md`.

## Files

| File | Role |
|---|---|
| `index.ts` | `@hono/node-server` entry — serves `app` on `:3001` |
| `app.ts` | Routes: `POST /api/generate` (SSE), `POST /api/validate`, `GET /api/health`; CORS + secure-headers |
| `providers.ts` | `buildModel(provider, key)` → per-request `createAnthropic` / `createOpenAI`; `ProviderId`, `DEFAULT_MODEL` |

## Trust boundary — BYOK (the thing not to break)

Clients **bring their own provider key**. The contract, enforced on every request:

- The key arrives **per request** in `Authorization: Bearer <key>` (a header — *never* the JSON
  body), with `x-llm-provider` naming the provider. Read by `readCredentials(c)` in `app.ts`.
- The key is used **once** via `buildModel(providerId, apiKey)` to construct the provider for that
  call, then discarded. It is **never stored, logged, cached, or written to disk**.
- CORS `allowHeaders` must keep `Authorization` and `x-llm-provider` (custom/auth headers are
  blocked by default). `Cache-Control: no-store` on key-handling responses.
- `/api/validate` is a 1-token probe that returns only `{ ok }` — it never echoes the key or raw
  provider error detail (which can carry request metadata).

When editing here: do not add logging that could capture the header; do not move the key to the
body; do not persist it. The PreToolUse hook blocks `.env*` reads as a backstop.

## Adding a provider

Four edits, kept in sync (the client registry mirrors this file — it must, or BYOK breaks):

1. `server/providers.ts` — extend the `ProviderId` union, add a `DEFAULT_MODEL` entry, add a
   factory `case` in `buildModel()` (and to `isProviderId`).
2. `src/llm/providers.ts` — add a `PROVIDERS` entry (id, label, default model, key hint).

The `add-provider` skill (`.claude/skills/`) walks this checklist.

## Changing the model

Edit `DEFAULT_MODEL` in `server/providers.ts` and the matching `defaultModel` in
`src/llm/providers.ts`. The system prompt lives in `SYSTEM_PROMPT` (top of `app.ts`); generation is
`streamText({ model, system, prompt, maxTokens: 4096 })`.

## Don'ts

- **Never** read the provider key from the request body or persist/log it.
- **Never** import server provider SDKs (`@ai-sdk/*`) into client code.
- Keep `ProviderId` + default models identical between `server/providers.ts` and `src/llm/providers.ts`.
