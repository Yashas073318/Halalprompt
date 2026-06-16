# Frontend (`src/`) — Claude context

Scoped context for the React/Vite client. Auto-loaded when you work under `src/`. The root
`CLAUDE.md` is the project hub; the BYOK server lives in `server/CLAUDE.md`.

## The one rule: single source of truth

Everything the form does derives from **`src/schema/template.ts`** (one `Template` object):

```
template.ts ──┬─ deriveSchema()    → Zod (RHF resolver)        [validation.ts]
              ├─ compileMarkdown() → markdown spec             [compiler.ts]
              └─ FormEngine render → switch on field.kind      [FormField.tsx]
```

**Adding/changing a question = edit `template.ts` only.** Render, validation, and markdown all
follow. After editing, the skill's `template.json` must be regenerated — run `npm run build:skill`
(the PostToolUse hook does this automatically) and confirm with `npm run verify`.

## Files

| File | Role |
|---|---|
| `schema/types.ts` | `Field \| Section \| Template`, `Answers`; `isFieldVisible()` helper |
| `schema/template.ts` | The questionnaire — **edit here**; includes `requirement_type` + conditional bug/feature sections |
| `schema/validation.ts` | `deriveSchema()` → Zod (+`superRefine` for conditional-required); `getDefaultValues()` |
| `schema/compiler.ts` | Pure `compileMarkdown(template, answers)` → string; skips hidden fields |
| `schema/presets.ts` | `REQUIREMENTS` · `ROLES` · `buildPreset(req, role)` → `Answers` (composition for all 27 presets) |
| `components/PromptBuilder.tsx` | Root: RHF form + `useCompletion` + draft persistence + preset state |
| `components/PresetWizard.tsx` | Two-step modal wizard (Requirement → Role → Apply) |
| `components/SectionCard.tsx` | Renders a section's visible fields; hides when all are hidden |
| `components/FormField.tsx` | Switches on `field.kind`; renders "from preset" badge |
| `components/PreviewPanel.tsx` | Three-tab pane (Raw · Preview · AI Response); doubles as mobile sheet |
| `context/ApiKeyContext.tsx` | In-memory BYOK key state (`save`/`forget`/`validate`) — never persisted |
| `llm/providers.ts` | Client provider registry (ids, labels, default models, key hints) — **no secrets, no `@ai-sdk/*`** |

## Field kinds

`text` · `textarea` · `select` · `multiselect` — all handled by `FormField.tsx`. To add a kind:
type in `types.ts`, Zod branch in `validation.ts`, render branch in `FormField.tsx`. Any kind can
also carry `visibleWhen` to become conditional — no new kind needed.

## Conditional fields (`visibleWhen`)

A field with `visibleWhen: { field, in[] }` is rendered/validated/compiled only when
`answers[field]` ∈ `in`. The single helper `isFieldVisible(field, answers)` (in `types.ts`) is the
**only** place this lives, called in `SectionCard.tsx` (filter; hide empty section), `validation.ts`
(`superRefine` for required-when-visible), and `compiler.ts` (skip hidden). Add `visibleWhen` to a
field definition — nothing else changes.

## Presets

A preset = Requirement × Role pre-fills the form with **soft** (editable) defaults; filled fields get
a "from preset" badge. `buildPreset(req, role)` composes `BASE + ROLE_DEFAULTS[role] +
REQUIREMENT_DEFAULTS[req]` (unions multiselect arrays, requirement overrides scalars) → one entry per
role/requirement, not 27 combos. Default is **no preset** (blank form unchanged). Applied atomically
via `form.reset({ ...getDefaultValues(template), ...prefill })`.

## State flow

```
RHF → form.watch() → compileMarkdown() → live markdown (useMemo, guarded by isFieldVisible)
    → form.handleSubmit() → complete(markdown)  [AI SDK useCompletion → /api/generate]
```

Generate is disabled while `isLoading`, while `!isValid`, and until an API key is set. Draft
persistence (`useFormPersistence`) debounces localStorage writes (400 ms), key
`prompt-draft-<templateId>`; merge is forward-compatible
(`{ ...getDefaultValues(template), ...savedDraft }`). The **key is never written to the draft**.

## Mobile layout

The preview/AI pane is one DOM element with two personalities: `< md` = fixed bottom sheet (FAB
opens, scrim + ✕ close); `md+` = `md:static` restores the `w-[400px]` side rail. One element avoids
double `react-markdown` parse cost per keystroke. Progress dots count only **visible** sections.

## Don'ts (trust boundary — enforced by the PreToolUse hook)

- **Never** add a model/provider call to client code. All model calls go through the server route.
- **Never** import `@ai-sdk/*` or read `process.env` here — `src/llm/providers.ts` is bundled to the browser.
- **Never** write the API key to `localStorage`, a draft, or the compiled markdown. Key lives in
  memory only (`ApiKeyContext`).
- Keep `src/llm/providers.ts` ids + default models in sync with `server/providers.ts`.
