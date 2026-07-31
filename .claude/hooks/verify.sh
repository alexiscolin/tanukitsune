#!/bin/bash
# Refuses the end of a turn on code that does not compile or lint, once: the
# stop_hook_active guard below bounds the guarantee to one forced continuation.
# Exit 2 makes the agent keep working, with stderr as the reason it receives.
# Runs pnpm gate, not pnpm verify: a hook killed on its timeout blocks nothing.

input=$(cat)

# Claude Code sets stop_hook_active when this hook already caused a block.
# An exported shell variable would not work: each invocation is a fresh process.
# Read without jq: the PATH that loses pnpm below loses a packaged jq with it, and this
# guard is what bounds every refusal below. Reasoning in verification.md#the-hooks.
grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' <<< "$input" && exit 0

# The interpreter resolves this script under CLAUDE_PROJECT_DIR before line 1 runs, so
# what is left to catch here is the directory going away mid-turn.
cd "${CLAUDE_PROJECT_DIR:-.}" || { printf 'The project directory went away, so nothing verified this turn.\n' >&2; exit 2; }

[ -f package.json ] || { printf 'No package.json in %s, so nothing verified this turn.\n' "$PWD" >&2; exit 2; }

# Hooks are not spawned from a login shell, so a pnpm installed through corepack, nvm
# or asdf can be absent here while present in a terminal.
command -v pnpm >/dev/null 2>&1 || { printf 'pnpm is not on this hook PATH, so nothing verified this turn.\n' >&2; exit 2; }

# exit 2 discards stdout, so merging would block the turn while withholding the
# errors needed to unblock it.
if ! out=$(pnpm gate 2>&1); then
  printf 'Verification failed. Fix this before concluding.\n\n%s\n' "$out" >&2
  exit 2
fi

exit 0
