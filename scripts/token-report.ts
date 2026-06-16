/**
 * token-report.ts — measure the dev-harness context cost (agent-build tooling).
 *
 * Replaces the plan's *estimated* token table with measured numbers: the size of
 * each CLAUDE.md, the generated skill payload, the SKILL.md, and a sample compiled
 * spec. Then it models the scoped-CLAUDE.md saving: a focused edit loads the slim
 * root hub plus only the one domain file it's working in, instead of one monolith
 * carrying every domain.
 *
 * Token counts are a ~4-chars/token heuristic (no tokenizer dependency) — good for
 * relative comparison, not billing. Run: `npm run token-report`. Run-only via tsx.
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PERFECT_PROMPT_TEMPLATE } from '../src/schema/template'
import { compileMarkdown } from '../src/schema/compiler'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const estTokens = (s: string) => Math.ceil(s.length / 4)
const pad = (s: string, n: number) => s.padEnd(n)
const num = (n: number) => n.toLocaleString('en-US')

function sizeOf(rel: string): { chars: number; tokens: number } | null {
  const p = resolve(repoRoot, rel)
  if (!existsSync(p) || !statSync(p).isFile()) return null
  const text = readFileSync(p, 'utf8')
  return { chars: text.length, tokens: estTokens(text) }
}

console.log('\nhalalprompt — dev-harness context cost (≈ chars/4 tokens)\n')
console.log(`${pad('artifact', 22)}${pad('chars', 10)}~tokens`)
console.log('─'.repeat(42))

const artifacts: { label: string; path: string }[] = [
  { label: 'CLAUDE.md (root)', path: 'CLAUDE.md' },
  { label: 'src/CLAUDE.md', path: 'src/CLAUDE.md' },
  { label: 'server/CLAUDE.md', path: 'server/CLAUDE.md' },
  { label: 'skill SKILL.md', path: 'plugins/perfect-prompt/skills/perfect-prompt/SKILL.md' },
  { label: 'skill template.json', path: 'plugins/perfect-prompt/skills/perfect-prompt/template.json' },
]
for (const { label, path } of artifacts) {
  const s = sizeOf(path)
  console.log(
    `${pad(label, 22)}${s ? pad(num(s.chars), 10) + num(s.tokens) : pad('—', 10) + '(absent)'}`,
  )
}

// A representative compiled spec, to show the runtime payload size.
const sampleSpec = compileMarkdown(PERFECT_PROMPT_TEMPLATE, {
  role_title: 'Solution Architect',
  objective_goal: 'Improve the dev harness',
  objective_deliverable: 'plan',
  context_background: 'Schema-driven prompt builder',
  scope_include: 'Docs, config, scripts',
  depth_level: 'thorough',
  tone_style: 'technical',
  tone_audience: 'intermediate',
})
console.log(
  `${pad('(sample spec)', 22)}${pad(num(sampleSpec.length), 10)}${num(estTokens(sampleSpec))}`,
)

// Scoped-CLAUDE.md saving model.
const root = sizeOf('CLAUDE.md')?.tokens ?? 0
const scoped = ['src/CLAUDE.md', 'server/CLAUDE.md']
  .map((r) => sizeOf(r)?.tokens ?? 0)
  .filter((t) => t > 0)
if (scoped.length > 0) {
  const monolith = root + scoped.reduce((a, b) => a + b, 0)
  const focused = root + Math.max(...scoped)
  console.log('\nScoped CLAUDE.md, per focused session:')
  console.log(`  monolith (root carries every domain): ~${num(monolith)} tokens`)
  console.log(`  scoped   (slim root + one domain):    ~${num(focused)} tokens`)
  console.log(`  saving on a focused edit:             ~${num(monolith - focused)} tokens\n`)
} else {
  console.log('\n(no scoped CLAUDE.md yet — run after adding src/ and server/ CLAUDE.md)\n')
}
