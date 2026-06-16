/**
 * build-skill.ts — single-source-of-truth codegen for the Claude Code plugin.
 *
 * Writes `template.json` next to the skill so the `/perfect-prompt` skill always
 * asks the exact same questions the web form does. The questionnaire is NEVER
 * hand-copied into the skill — re-run `npm run build:skill` whenever
 * `src/schema/template.ts` changes (the PostToolUse hook does this automatically).
 *
 * The *how* and *where* of the payload live in `skill-payload.ts`, shared with
 * `verify-parity.ts` so the codegen and its eval can never disagree.
 *
 * Run-only (executed via tsx); intentionally not part of the tsc build graph.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SKILL_TEMPLATE_PATH, serializeSkillPayload } from './skill-payload'

mkdirSync(dirname(SKILL_TEMPLATE_PATH), { recursive: true })
writeFileSync(SKILL_TEMPLATE_PATH, serializeSkillPayload(), 'utf8')

console.log(`build-skill: wrote ${SKILL_TEMPLATE_PATH}`)
