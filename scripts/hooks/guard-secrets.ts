/**
 * guard-secrets.ts — PreToolUse hook (BYOK backstop).
 *
 * Blocks reads of `.env*` files so a provider key or other secret can't be pulled
 * into the transcript. Exit 2 + stderr = the tool call is denied and the reason is
 * shown to Claude; exit 0 = allowed. The real guarantee is the server never logging
 * the key (see server/CLAUDE.md) — this just keeps secrets out of context by reflex.
 *
 * Reads the hook payload as JSON on stdin: { tool_input: { file_path } }.
 */
async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let path = ''
  try {
    const payload = JSON.parse(raw || '{}')
    path = String(payload?.tool_input?.file_path ?? '')
  } catch {
    process.exit(0) // unparsable → don't block
  }

  const base = path.replace(/\\/g, '/').split('/').pop() ?? ''
  const isEnvFile = /^\.env(\.|$)/.test(base)
  const isTemplate = /\.(example|sample|template)$/.test(base) // .env.example is safe
  if (isEnvFile && !isTemplate) {
    console.error(
      `Blocked: ${base} may contain secrets (BYOK key). Reading it into context is not allowed. ` +
        `Env names live in .env.example.`,
    )
    process.exit(2)
  }
  process.exit(0)
}

main()
