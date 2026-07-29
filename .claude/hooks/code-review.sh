#!/bin/bash
# Demands the review lenses on the code committed since they last read it.
#
# Fires from PostToolUse on Bash, so the trigger is the commit itself rather
# than a turn boundary, and the diff it names is the accumulated range since the
# marker rather than the one commit: a red test read without its implementation
# is a reading of half a slice.
#
# Markdown is excluded because docs-conformity already owns it. Everything else
# is code, which is a rule with no path list to drift out of date.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

marker=.claude/.review-reviewed
seen=.claude/.review-head
head=$(git rev-parse HEAD 2>/dev/null) || exit 0

# A commit happened when HEAD moved between two shell calls. Matching the command
# string instead would miss `git -C . commit` and fire on any command that merely
# names one, which is a trigger that both under- and over-reports.
[ "$(cat "$seen" 2>/dev/null || true)" = "$head" ] && exit 0
printf '%s' "$head" > "$seen"
base=$(cat "$marker" 2>/dev/null || true)

# No usable marker means nothing on this branch has been read yet, so the range
# starts where the branch does. On main the two collapse and nothing is demanded.
if [ -z "$base" ] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  base=$(git merge-base main HEAD 2>/dev/null) || exit 0
fi

[ "$base" = "$head" ] && exit 0

changed=$(git diff --name-only "$base".."$head" | grep -v '\.md$' || true)
[ -z "$changed" ] && exit 0

cat >&2 <<EOF
Code was committed that no lens has read. Spawn all five over ${base:0:8}..${head:0:8},
in parallel and not in the background, each with the plan or spec and the diff path:

  requirement-check   is this what was asked for, no more and no less
  regression-check    behaviour that worked and now behaves differently
  security-check      untrusted input, secrets, client boundary, authorisation
  architecture-check  boundaries, duplication against existing code, premature abstraction
  performance-check   N+1 queries, complexity, sequential awaits

requirement-check reads the requirement before the diff, in that order.

Then record every finding and its outcome in .claude/review-log.jsonl, and mark
the range as read:

  printf '%s' "$head" > $marker

Files in the range:
$(printf '%s\n' "$changed" | sed 's/^/  /')
EOF
exit 2
