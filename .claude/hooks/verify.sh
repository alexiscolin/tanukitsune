#!/bin/bash
# Refuses the end of a turn on code that does not compile or lint, once: the
# stop_hook_active guard below bounds the guarantee to one forced continuation.
# Exit 2 makes the agent keep working, with stderr as the reason it receives.
# Runs pnpm gate, not pnpm verify: a hook killed on its timeout blocks nothing.

input=$(cat)

# Claude Code sets stop_hook_active when this hook already caused a block.
# An exported shell variable would not work: each invocation is a fresh process.
# Read without jq, which no document lists as a prerequisite: this guard is what bounds
# every refusal below, and a PATH thin enough to lose pnpm loses a packaged jq with it,
# so reading it through one would drop the bound in the same environment that needs it.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# A hook that cannot run has no guarantee to give, and from outside a hook that passed
# and a hook that never ran are the same observation, so each condition names itself.
cd "${CLAUDE_PROJECT_DIR:-.}" || {
  printf 'The project directory is unreachable, so nothing verified this turn.\n' >&2
  exit 2
}

if [ ! -f package.json ]; then
  printf 'No package.json in %s, so nothing verified this turn.\n' "$PWD" >&2
  exit 2
fi

# Hooks are not spawned from a login shell, so a pnpm installed through corepack, nvm
# or asdf can be absent here while present in a terminal.
if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is not on this hook PATH, so nothing verified this turn.\n' >&2
  exit 2
fi

# exit 2 discards stdout, so merging would block the turn while withholding the
# errors needed to unblock it.
if ! out=$(pnpm gate 2>&1); then
  printf 'Verification failed. Fix this before concluding.\n\n%s\n' "$out" >&2
  exit 2
fi

exit 0
