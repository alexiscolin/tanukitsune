#!/bin/bash
# Refuses the end of a turn on code that does not compile or lint, once: the
# stop_hook_active guard below bounds the guarantee to one forced continuation.
# Exit 2 makes the agent keep working, with stderr as the reason it receives.
# Runs pnpm gate, not pnpm verify: a hook killed on its timeout blocks nothing.

input=$(cat)

# Claude Code sets stop_hook_active when this hook already caused a block.
# An exported shell variable would not work: each invocation is a fresh process.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

# A hook that cannot run has no guarantee to give, and from outside a hook that passed
# and a hook that never ran are the same observation. Each condition names itself, and
# stop_hook_active bounds the refusal to one turn the same way a failed gate is bounded.
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
