/**
 * parity-warn.ts — Stop hook (advisory).
 *
 * Runs the fast parity eval (A: template.json sync, B: compiler goldens — no tsc)
 * when a session ends, and prints a warning if anything drifted. **Always exits 0**
 * so it can never block stopping or trigger a fix-loop; enforcement lives in
 * `npm run verify` (CI / the parity-keeper agent / the weekly routine).
 *
 * If the per-turn cost isn't worth it for you, delete the "Stop" entry in
 * .claude/settings.json — the PostToolUse rebuild already prevents the common drift.
 */
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['tsx', 'scripts/verify-parity.ts'], {
  stdio: 'inherit',
  shell: true,
})
if (r.status !== 0) {
  console.error(
    '\n[hook] Parity drift at session end — run `npm run verify` ' +
      '(then `npm run build:skill` or `npm run verify:update` as appropriate).',
  )
}
process.exit(0)
