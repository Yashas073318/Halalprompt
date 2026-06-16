# Working with Claude More Efficiently — Token-Efficiency Playbook

> **Source & scope.** This playbook is general methodology, distilled from a retro on a *different*
> project (an API-encryption rollout — `enc` middleware, `verify-encryption.js`, `ENC_ENFORCE`).
> **Those artifacts do not exist in halalprompt.** Read the techniques as patterns; the
> *"Applied to halalprompt"* section maps each onto this repo's real harness. The kickoff checklist
> is mirrored in the root `CLAUDE.md`.

## 1. Where the tokens actually go (four sinks)

1. **One monolithic context.** A single long thread re-sends its whole history every turn, so cost
   grows worse than linearly until it must be compacted. **#1 sink.**
2. **Whole-file reads.** Reading 400+ line files when ~20 lines mattered.
3. **Re-reads after compaction.** Compaction drops detail; files get re-read to recover it.
4. **A large artifact echoing** through the thread, the summary, and resume.

Throughline: **keep the main thread small.** Almost every technique attacks #1–#3.

## 2. Techniques

### Mechanisms (real Claude Code features)
| Technique | What it is | Trigger |
|---|---|---|
| **Subagents** | Fresh-context agent; only its final summary returns. Its reads never enter your thread. | "Use a subagent to map X." Signal: read-heavy, small output. |
| **Parallel agents** | Several subagents at once, for **independent** slices. | "Explore A and B in parallel." |
| **Background agents** | Async work; you're notified on completion (don't poll). | `run_in_background`. |
| **Hooks** | Shell commands the harness fires on events, **outside the token budget**. | `.claude/settings.json`. Deterministic + checkable → a hook, not a reasoning step. |
| **Agent-build tooling** | Write a small script once; call it cheaply forever. | "Turn that check into a script" when it repeats > twice. |
| **Worktrees / multi-window** | Independent sessions, each a clean context, on `git worktree`s so they don't collide. | `git worktree add …`. Slice along file boundaries. |

### Patterns
| Pattern | What it is |
|---|---|
| **Agent loops** | act → observe → decide. Keep observations small (line ranges, scripted checks) so many loops fit. |
| **Eval-driven loops** | Define a pass/fail **eval first**, iterate to green. |
| **Self-improving loops** | Capture what was learned so the next run doesn't re-derive it (CLAUDE.md / memory). **Highest ROI.** |
| **Dynamic workflows** | Branch on intermediate results instead of a fixed script. |

## 2b. When to use a subagent (concrete triggers)

The signal is **"read-heavy, small output"** — exploration you'd summarize anyway. Without a
concrete trigger list, the reflex is to read files directly in the main thread.

- Open > ~2 unseen files to answer a question whose answer fits in a table or short list → **subagent**.
- "What does X document / define / export?" → subagent.
- "Map all Y touchpoints" → subagent (or parallel subagents for independent slices).
- "Is A still aligned with B?" (audit) → subagent, or a specialist agent if one exists.

**What you lose if you skip it:** the reads land in your main thread, they get re-summarized by
compaction, and later turns pay to re-read to recover what compaction dropped (playbook sink #3).

## 3. Top 3 highest-leverage moves
1. **Subagents for any "map/audit X" task** — exploration tokens never touch the main thread.
2. **Distill durable rules into `CLAUDE.md`** — stops cross-session re-learning.
3. **Build the eval as a script; run it (in background)** — recurring verification becomes ~free.

## 4. Kickoff checklist (any non-trivial task)
- [ ] Read-heavy with a small output? → **subagent** (parallel if slices are independent).
- [ ] What's the **eval** that proves "done"? Build it first (script > eyeballing).
- [ ] Can the work be sliced across **worktrees/windows**?
- [ ] A deterministic check I keep repeating? → **hook** or **script**, not reasoning.
- [ ] What did we learn that a future session would re-derive? → **CLAUDE.md / memory**.
- [ ] Keep observations small: read **line ranges**, not whole files.

---

## Applied to halalprompt

| Playbook technique | Encryption-project example | halalprompt equivalent (in this repo) |
|---|---|---|
| Self-improving loop → CLAUDE.md | `CLAUDE.md §7` enc rules | Scoped `src/CLAUDE.md` + `server/CLAUDE.md`; slim root hub |
| Eval-driven loop / agent-build tooling | `verify-encryption.js` | **`npm run verify`** → `scripts/verify-parity.ts` (SSOT parity + compiler goldens + `tsc -b`) |
| Hooks | `node --check` per edit (JS-only) | `.claude/settings.json`: PostToolUse `build:skill` on `template.ts`, Stop `verify`, PreToolUse block `.env*` |
| Subagents / parallel | map routes + callers | `.claude/agents/`: `trust-boundary-reviewer`, `parity-keeper` |
| Background agents | run the eval async | `npm run verify` via `run_in_background`; weekly routine |
| Worktrees / windows | backend / frontend / keys | slice `src/` ‖ `server/` ‖ skill+scripts |
| Skills | — | `.claude/skills/`: `add-question`, `add-provider` |

**Note on the hook adaptation:** the playbook's `node --check "$CLAUDE_FILE_PATH"` only parses
JavaScript. halalprompt is TypeScript/TSX, so a per-edit `node --check` would error on valid TS.
The halalprompt hooks instead run the fast `build:skill` per `template.ts` edit and the full
`npm run verify` (which includes `tsc -b`) at Stop.
