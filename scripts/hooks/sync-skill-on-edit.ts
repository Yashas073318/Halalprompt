/**
 * sync-skill-on-edit.ts — PostToolUse hook.
 *
 * Fires after every Edit/Write. If the edited file was the questionnaire source
 * (`src/schema/template.ts`), regenerate the skill's `template.json` so it can never
 * drift — encoding the "re-run build:skill" rule the docs state but can't enforce.
 * For any other file it's a no-op. Always exits 0 (advisory; never blocks the edit).
 *
 * Reads the hook payload as JSON on stdin: { tool_input: { file_path } }.
 */
import { execSync } from 'node:child_process'

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let path = ''
  try {
    const payload = JSON.parse(raw || '{}')
    path = String(payload?.tool_input?.file_path ?? '')
  } catch {
    return // unparsable payload → do nothing
  }

  const norm = path.replace(/\\/g, '/')
  if (!norm.endsWith('src/schema/template.ts')) return

  try {
    execSync('npm run build:skill', { stdio: 'inherit' })
    console.error('[hook] template.ts changed → rebuilt skill template.json. Run `npm run verify`.')
  } catch {
    console.error('[hook] build:skill failed after template.ts edit — run `npm run build:skill` manually.')
  }
}

main().finally(() => process.exit(0))
