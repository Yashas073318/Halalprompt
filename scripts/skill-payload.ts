/**
 * skill-payload.ts — shared serializer for the Claude Code skill's `template.json`.
 *
 * Single owner of *how* the skill payload is built and *where* it lives, imported by
 * both `build-skill.ts` (which writes it) and `verify-parity.ts` (which checks it).
 * Keeping this in one place means the two scripts can never disagree about the
 * generated-notice string or path — which is exactly the drift the eval guards against.
 *
 * Run-only via tsx; never imported by the app bundle.
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PERFECT_PROMPT_TEMPLATE } from '../src/schema/template'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Absolute path of the generated skill questionnaire data. */
export const SKILL_TEMPLATE_PATH = resolve(
  repoRoot,
  'plugins/perfect-prompt/skills/perfect-prompt/template.json',
)

/** Header key stamped into the generated file so no one hand-edits it. */
export const GENERATED_NOTICE =
  'DO NOT EDIT — generated from src/schema/template.ts by scripts/build-skill.ts. Run `npm run build:skill`.'

/**
 * Serialize the canonical questionnaire to the exact bytes that should live in
 * `template.json` (2-space JSON + trailing newline). Pure — no side effects.
 */
export function serializeSkillPayload(): string {
  return (
    JSON.stringify(
      { _generated: GENERATED_NOTICE, ...PERFECT_PROMPT_TEMPLATE },
      null,
      2,
    ) + '\n'
  )
}
