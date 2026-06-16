# halalprompt

Schema-driven LLM prompt-builder. A guided form compiles structured answers into a markdown spec,
then streams it to Claude via a server-side API route. A Claude Code plugin (`/perfect-prompt`)
runs the **same** questionnaire keyless, inside the host.

## Dev setup

```bash
cp .env.example .env.local   # optional server settings; LLM keys are entered in-app (BYOK)
npm install
npm run dev                  # Vite :5173 + Hono :3001 via concurrently
```

`npm run build` — `build:skill` → `tsc -b` → Vite bundle. `npm run verify` — the parity eval (run
this instead of re-reading files to confirm nothing drifted).

## Where context lives (scoped CLAUDE.md)

Work in one area at a time so Claude loads only that area's context:

| Working in… | Read | Covers |
|---|---|---|
| `src/**` (React client) | **`src/CLAUDE.md`** | template SSOT, field kinds, `visibleWhen`, presets, state flow, mobile, drafts |
| `server/**` (Hono API) | **`server/CLAUDE.md`** | routes, BYOK trust boundary, providers, adding a provider |
| plugin / skill | this file's *Plugin* section + `plugins/perfect-prompt/skills/perfect-prompt/SKILL.md` | the keyless `/perfect-prompt` consumer |

## Architecture: single source of truth

Everything derives from **`src/schema/template.ts`** — one `Template` object:

```
template.ts ──┬─ deriveSchema()    → Zod (RHF resolver)
              ├─ compileMarkdown() → markdown spec (live preview + LLM payload + the skill)
              └─ FormField render  → switch on field.kind
```

**Adding/changing a question = edit `template.ts` only**, then `npm run build:skill` (a PostToolUse
hook does this automatically) and `npm run verify`. Detail lives in the scoped files.

## Trust boundary (BYOK) — summary

Clients bring their own provider key; it rides **per request** in `Authorization: Bearer …` (+
`x-llm-provider`), is used once via `buildModel()`, and is **never stored, logged, or written to
disk**. On the client it lives in memory only — never `localStorage`, never the draft, never the
compiled spec. **All model calls go through the server route — never add model calls to client
code.** Full contract: `server/CLAUDE.md`.

## Dev harness (working on this repo with Claude)

Encodes the [token-efficiency playbook](docs/token-efficiency-playbook.md). Reach for these instead
of re-deriving or eyeballing:

- **The eval — `npm run verify`.** Binary pass/fail for the two SSOT invariants: (A) `template.json`
  matches `template.ts`, (B) `examples/*.json` compile byte-for-byte to `scripts/golden/*.md`; then
  `tsc -b`. After an *intended* template/compiler change, `npm run verify:update` regenerates goldens
  (review the diff). Source: `scripts/verify-parity.ts` (+ shared `scripts/skill-payload.ts`).
- **`npm run token-report`** — measured context cost of each CLAUDE.md / skill artifact + the scoped
  saving.
- **Hooks** (`.claude/settings.json`): PostToolUse rebuilds the skill on `template.ts` edits; Stop
  runs `npm run verify`; PreToolUse blocks `.env*` reads (BYOK backstop).
- **Subagents** (`.claude/agents/`): `trust-boundary-reviewer` (read-only diff audit for key leaks /
  client model calls), `parity-keeper` (template ↔ skill ↔ compiler sync). Use a subagent for any
  read-heavy *map/audit* task so the file reads stay out of the main thread.
- **Skills** (`.claude/skills/`): `add-question`, `add-provider` — the multi-file change checklists.

### When to use a subagent in this repo

The signal is **"read-heavy, small output"** — exploration you'd summarize anyway. In this repo that
means:

| Question | Subagent call (say this) |
|---|---|
| "What BYOK-related code exists?" | "Use a subagent to map all BYOK/key-handling touchpoints" |
| "What does the plugin README document?" | "Use a subagent to summarize the plugin README" |
| "What options does the template define?" | "Use a subagent to list all field ids and their options from template.ts" |
| "Is the SKILL.md compile logic still aligned with compiler.ts?" | "Use a subagent — or the parity-keeper agent" |
| "What's the current dev-harness surface?" | "Use a subagent (Explore) to map .claude/, scripts/hooks/, and docs/" |

**Rule of thumb:** if answering requires opening more than ~2 files you haven't read yet, and the
answer fits in a table or short list — it's a subagent. The file reads stay in the subagent's context;
only the summary returns to the main thread.

Run two subagents in parallel when the slices are independent (e.g. auditing `src/` and `server/` at
the same time for a BYOK review).

### Kickoff checklist (any non-trivial task)

- [ ] Read-heavy with a small output? → **subagent** (parallel if the slices are independent).
- [ ] What's the **eval** that proves "done"? Prefer `npm run verify` / a script over eyeballing.
- [ ] Can the work be sliced across **worktrees** (`src/` ‖ `server/` ‖ skill+scripts) to avoid one giant context?
- [ ] A deterministic check you keep repeating? → a **hook** or **script**, not reasoning.
- [ ] Learned something a future session would re-derive? → add it to the relevant **CLAUDE.md / memory**.
- [ ] Keep observations small: read **line ranges**, not whole files.

## Claude Code plugin (`/perfect-prompt`)

A second consumer of the same questionnaire, run **inside Claude Code** — keyless (the host *is* the
LLM: no BYOK, no server, no `/api/*`). It asks the six sections conversationally, compiles the
**identical** markdown spec, shows it, then answers it in-session.

| Path | Role |
|---|---|
| `scripts/build-skill.ts` | Codegen: `PERFECT_PROMPT_TEMPLATE` → the skill's `template.json` (via `npm run build:skill`) |
| `scripts/skill-payload.ts` | Shared payload serializer (used by build-skill **and** the eval) |
| `scripts/verify-parity.ts` · `scripts/golden/` | The eval + its golden snapshots |
| `plugins/perfect-prompt/skills/perfect-prompt/SKILL.md` | Workflow + compiler rules (ported from `compiler.ts`) |
| `plugins/perfect-prompt/skills/perfect-prompt/template.json` | **Generated — do not hand-edit** |
| `plugins/perfect-prompt/skills/perfect-prompt/examples/` | Practice answer sets (replayed by the eval) |
| `plugins/perfect-prompt/commands/perfect-prompt.md` · `.claude-plugin/*` | Slash command + manifests |

`template.json` is the **single source of truth made portable**: edit `template.ts`, run
`npm run build:skill`, `npm run verify` enforces parity. Install locally with `/plugin marketplace
add .` then `/plugin install perfect-prompt@halalprompt`.

## Stack

- Vite 6 + React 19 + TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`)
- React Hook Form + Zod
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) — `useCompletion` (client),
  `streamText`/`generateText` (server), per-request `createAnthropic`/`createOpenAI`
- Hono + `@hono/node-server` · `react-markdown` + `remark-gfm`
