#!/bin/bash
# Blocks a turn ending on code that does not compile or lint.
# Exit 2 makes the agent keep working, with stderr as the reason it receives.
# Runs pnpm gate, not pnpm verify: a hook killed on its timeout blocks nothing.

# The nested reviewer holds Read, Grep and Glob, so it cannot have broken a build,
# and a gate failure it cannot fix would become the report the parent reads.
[ -n "${TANUKITSUNE_NESTED_REVIEW:-}" ] && exit 0

input=$(cat)

# Claude Code sets stop_hook_active when this hook already caused a block.
# An exported shell variable would not work: each invocation is a fresh process.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

[ -f package.json ] || exit 0
command -v pnpm >/dev/null 2>&1 || exit 0

# exit 2 discards stdout, so merging would block the turn while withholding the
# errors needed to unblock it.
if ! out=$(pnpm gate 2>&1); then
  printf 'Verification failed. Fix this before concluding.\n\n%s\n' "$out" >&2
  exit 2
fi

exit 0
