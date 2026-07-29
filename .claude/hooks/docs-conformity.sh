#!/bin/bash
# Reads the documentation set against itself, against the code it describes and
# against the comments carrying the same constraints, then wakes the agent only
# when it finds a contradiction.
#
# Registered with asyncRewake, so this runs detached and exit 2 is what brings
# the agent back with stderr as the reason. check-docs.sh proves a link resolves
# and a count holds; nothing deterministic can prove two documents still agree,
# which is why the trigger is a digest and the reading is a model.

set -uo pipefail

# The nested session below loads this same configuration and would run this hook
# at its own turn end. A shell variable is inherited by a child process, which is
# what stop_hook_active is not.
[ -n "${TANUKITSUNE_CONFORMITY_RUNNING:-}" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
command -v git >/dev/null 2>&1 || exit 0
command -v claude >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

marker=.claude/.conformity-reviewed
lock=.claude/.conformity-running

# Gitignored, so git never lists it, and it describes this system rather than the
# person operating it. Left out of the set it would be the one document able to
# contradict the others without anything noticing.
described=info/workflow-explique.md

# Every markdown file describing this system, content-digested in a stable order.
# The two human-facing documents under docs/ record provenance rather than state,
# and info/ describes the person rather than the system, so neither can put the
# reviewer to work. The one file named above is the exception, and it is added
# back explicitly because git never lists it.
digest=$(git ls-files -co --exclude-standard -- '*.md' \
  | grep -v '^info/' \
  | grep -v '^docs/agent-log\.md$' \
  | grep -v '^docs/sources\.md$' \
  | cat - <(printf '%s\n' "$described") \
  | sort \
  | while IFS= read -r file; do [ -f "$file" ] && shasum "$file"; done \
  | shasum | cut -d' ' -f1)

[ -f "$marker" ] && [ "$(cat "$marker")" = "$digest" ] && exit 0

# One review per documentation state. mkdir is the atomic primitive here: two
# turns touching documentation in a row would otherwise read the same set twice.
mkdir "$lock" 2>/dev/null || exit 0
trap 'rmdir "$lock" 2>/dev/null' EXIT

report=$(TANUKITSUNE_CONFORMITY_RUNNING=1 claude -p \
  "Read .claude/agents/docs-conformity.md and follow it exactly as your instructions.
Repository root is the working directory. Review the whole documentation set.
Answer with the single word CLEAN on the first line if you find nothing, and
nothing else. Otherwise list each contradiction with file:line on both sides." \
  --model sonnet \
  --allowed-tools Read,Grep,Glob 2>/dev/null)

# A failed invocation is not a clean review, and recording it as one would retire
# the marker on a pass that never happened.
[ -z "$report" ] && exit 0

# The review runs detached for minutes while the agent keeps editing, so it can
# finish holding findings about text that no longer exists. Reporting those wastes
# a turn on a correction already made. If the set moved, drop this pass: the next
# turn end re-runs it against whatever the documentation settled on.
settled=$(git ls-files -co --exclude-standard -- '*.md' \
  | grep -v '^info/' \
  | grep -v '^docs/agent-log\.md$' \
  | grep -v '^docs/sources\.md$' \
  | cat - <(printf '%s\n' "$described") \
  | sort \
  | while IFS= read -r file; do [ -f "$file" ] && shasum "$file"; done \
  | shasum | cut -d' ' -f1)
[ "$settled" = "$digest" ] || exit 0

if [ "$(printf '%s' "$report" | head -n 1 | tr -d '[:space:]')" = "CLEAN" ]; then
  printf '%s' "$digest" > "$marker"
  exit 0
fi

printf 'The documentation conformity reviewer found contradictions.\n\n%s\n' "$report" >&2
exit 2
