#!/bin/bash
# Blocks a turn ending on documentation that changed without the conformity
# reviewer reading it. check-docs.sh proves a link resolves and a count holds;
# nothing deterministic can prove that two documents still agree, so the trigger
# is mechanical and the reading is not.
#
# Exit 2 refuses the end of the turn and returns stderr as the reason.

input=$(cat)

# Claude Code sets stop_hook_active when this hook already caused a block. An
# exported shell variable would not work: each invocation is a fresh process.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

marker=.claude/.conformity-reviewed

# Tracked and untracked markdown, content-digested in a stable order. info/ is
# out of the project, and the two human-facing documents record provenance
# rather than state, so none of the three can put the reviewer to work.
digest=$(git ls-files -co --exclude-standard -- '*.md' \
  | grep -v '^info/' \
  | grep -v '^docs/agent-log\.md$' \
  | grep -v '^docs/sources\.md$' \
  | sort \
  | while IFS= read -r file; do [ -f "$file" ] && shasum "$file"; done \
  | shasum | cut -d' ' -f1)

[ -f "$marker" ] && [ "$(cat "$marker")" = "$digest" ] && exit 0

cat >&2 <<EOF
Documentation changed since the conformity reviewer last read it.

Spawn the docs-conformity agent over the whole set, address what it reports,
then record the state you reviewed:

  printf '%s' "$digest" > $marker

It reads each document against the rest of the set, against the code they
describe, and against the code comments that carry the same constraints.
EOF
exit 2
