---
name: add-question
description: Add or change a question in halalprompt's questionnaire the single-source-of-truth way. Use when the user wants to add, remove, reorder, or edit a form field/section, change options, or make a field conditional. Because everything derives from src/schema/template.ts, this is almost always a one-file edit plus a regen + eval — this skill keeps you from touching the render/validation/compiler by hand.
---

# Add or change a question

In halalprompt the form, its Zod validation, the markdown compiler, **and** the `/perfect-prompt`
skill all derive from one object: `PERFECT_PROMPT_TEMPLATE` in **`src/schema/template.ts`**. So
adding a question is (almost always) a single edit there.

## Steps

1. **Edit `src/schema/template.ts` only.** Add the field to the right section's `fields[]` (or add a
   section). A field needs `id` (unique, snake_case), `kind` (`text` | `textarea` | `select` |
   `multiselect`), `label`, `required`. Choice kinds need `options: { value, label }[]`. Optional:
   `placeholder`, `hint`, `maxLength`/`rows`.
   - **Conditional field?** Add `visibleWhen: { field: '<driver_id>', in: ['<value>', …] }`. That
     single property makes it render/validate/compile only when the driver matches — handled
     centrally by `isFieldVisible()`. Do **not** add per-field logic to SectionCard/validation/compiler.
2. **Regenerate the skill payload:** `npm run build:skill` (the PostToolUse hook also fires on this
   file). This rewrites `plugins/perfect-prompt/skills/perfect-prompt/template.json`.
3. **Run the eval:** `npm run verify`. Check A confirms the regen; check B will fail if the new field
   changes how existing examples compile (it shouldn't, unless you edited a field an example uses).
4. **If an example's compiled output legitimately changed**, run `npm run verify:update` and review
   the golden diff before committing. If it changed unexpectedly, you altered existing behavior —
   investigate instead of updating.

## Don't

- Don't hand-edit `template.json` (generated) or the render/validation/compiler for a plain field —
  they switch on `field.kind` generically.
- Only add a Zod branch (`validation.ts`) + render branch (`FormField.tsx`) + type (`types.ts`) when
  introducing a **brand-new `kind`**, not a new field.
- Don't reorder/rename fields casually — `id`s are referenced by drafts, presets, and examples.
