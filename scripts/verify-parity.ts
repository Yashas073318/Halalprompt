/**
 * verify-parity.ts — the halalprompt "eval" (eval-driven loop + agent-build tooling).
 *
 * One deterministic, binary pass/fail check of the repo's single-source-of-truth
 * invariants, so Claude (or CI) never re-verifies them by hand in-context:
 *
 *   A. SSOT data parity  — the committed skill `template.json` equals what
 *      `build-skill` generates from `src/schema/template.ts` right now.
 *   B. Compiler goldens  — every practice answer-set in the skill's `examples/`
 *      compiles, via the app's real `compileMarkdown`, byte-for-byte to its
 *      committed golden under `scripts/golden/`. This pins the compiler whose
 *      rules the SKILL.md ports by hand.
 *
 * Type-checking (`tsc -b`) is chained separately in the `verify` npm script, so a
 * green `npm run verify` means: data parity ✓, compiler stable ✓, types ✓.
 *
 *   npm run verify          check — exits non-zero on any drift (use in CI / Stop hook)
 *   npm run verify:update   regenerate goldens after an *intended* compiler/template change
 *
 * Run-only via tsx; never imported by the app.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PERFECT_PROMPT_TEMPLATE } from '../src/schema/template'
import { compileMarkdown } from '../src/schema/compiler'
import type { Answers } from '../src/schema/types'
import { SKILL_TEMPLATE_PATH, serializeSkillPayload } from './skill-payload'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const update = process.argv.includes('--update')

const examplesDir = resolve(
  repoRoot,
  'plugins/perfect-prompt/skills/perfect-prompt/examples',
)
const goldenDir = resolve(repoRoot, 'scripts/golden')

const failures: string[] = []
const ok = (msg: string) => console.log(`  ✓ ${msg}`)
const bad = (msg: string) => {
  failures.push(msg)
  console.log(`  ✗ ${msg}`)
}

/** First line index where two strings diverge — for a readable failure message. */
function firstDivergence(a: string, b: string): string {
  const al = a.split('\n')
  const bl = b.split('\n')
  const n = Math.max(al.length, bl.length)
  for (let i = 0; i < n; i++) {
    if (al[i] !== bl[i]) {
      return `line ${i + 1}: expected ${JSON.stringify(al[i] ?? '<eof>')}, got ${JSON.stringify(bl[i] ?? '<eof>')}`
    }
  }
  return 'files differ in length only'
}

/** Drop bookkeeping keys (e.g. `_note`) so only real field answers remain. */
function toAnswers(raw: Record<string, unknown>): Answers {
  const out: Answers = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    if (typeof v === 'string' || Array.isArray(v)) out[k] = v as Answers[string]
  }
  return out
}

console.log('\nA. SSOT data parity (template.ts → template.json)')
const committed = readFileSync(SKILL_TEMPLATE_PATH, 'utf8')
if (committed === serializeSkillPayload()) {
  ok('template.json matches template.ts')
} else {
  bad('template.json is stale — run `npm run build:skill`')
}

console.log('\nB. Compiler goldens (examples/*.json → compileMarkdown)')
mkdirSync(goldenDir, { recursive: true })
const exampleFiles = readdirSync(examplesDir).filter((f) => f.endsWith('.json'))
for (const file of exampleFiles) {
  const answers = toAnswers(
    JSON.parse(readFileSync(resolve(examplesDir, file), 'utf8')),
  )
  const compiled = compileMarkdown(PERFECT_PROMPT_TEMPLATE, answers)
  const goldenPath = resolve(goldenDir, basename(file, '.json') + '.md')

  if (update) {
    writeFileSync(goldenPath, compiled, 'utf8')
    ok(`wrote golden for ${file}`)
    continue
  }

  let golden: string | null = null
  try {
    golden = readFileSync(goldenPath, 'utf8')
  } catch {
    bad(`${file}: no golden — run \`npm run verify:update\``)
    continue
  }
  if (golden === compiled) ok(`${file} compiles to its golden`)
  else bad(`${file}: drift — ${firstDivergence(golden, compiled)}`)
}

if (update) {
  console.log('\nGoldens regenerated. Review the diff before committing.\n')
  process.exit(0)
}

if (failures.length > 0) {
  console.log(`\nFAIL — ${failures.length} parity check(s) failed.\n`)
  process.exit(1)
}
console.log('\nPASS — all parity checks green.\n')
