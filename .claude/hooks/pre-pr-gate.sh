#!/bin/bash
# Refuses to open a pull request over code no review pass has read.
# Runs scripts/check-review-coverage.sh, the same script the pull request job runs.
#
# Quoted spans are removed and newlines flattened before matching, since a command
# that merely contains the invocation inside a string or a heredoc body is describing
# it rather than running it, and refusing those makes the hook fire on its own tests,
# on any document quoting it, and on a commit message naming it. Flattening is what
# confines the start-of-string anchor to the command, grep being line-oriented. What
# is left is matched at a command position only. An alias and an environment-prefixed
# call still slip through, which is affordable here and nowhere else: a miss falls
# through to the pull request job, which refuses the merge anyway.

set -uo pipefail

command -v jq >/dev/null 2>&1 || {
  printf 'jq is missing, so this hook cannot read the command it was given.\n' >&2
  exit 2
}

input=$(cat)

# This runs before every shell command the agent makes, on its critical path, so the
# three processes below are spent only where the invocation could possibly be.
case $input in
  *gh*) ;;
  *) exit 0 ;;
esac

command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || true)

unquoted=$(printf '%s' "$command" | sed "s/'[^']*'//g; s/\"[^\"]*\"//g" | tr '\n' ' ')
printf '%s' "$unquoted" \
  | grep -Eq '(^|[;&|(]|&&|\|\|)[[:space:]]*gh[[:space:]]+pr[[:space:]]+create([[:space:]]|$)' \
  || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f scripts/check-review-coverage.sh ] || exit 0

report=$(bash scripts/check-review-coverage.sh main 2>&1) && exit 0

printf 'This pull request would carry work the review gate refuses.\n\n%s\n' "$report" >&2
exit 2
