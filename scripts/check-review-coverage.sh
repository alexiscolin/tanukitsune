#!/bin/bash
# Refuses a range of code that no review pass recorded reading, and a finding left
# without a sort. Runs from the commit hook, the pre-PR hook and the pull request
# job, so what reports locally and what blocks a merge cannot drift apart.
#
# Exit codes are distinct because the callers want different questions answered:
#   0  every commit of code is covered and nothing is pending
#   1  code no pass has read, and stdout carries `range <base> <head>` for it
#   2  a finding with no outcome
#   3  the environment or the log cannot answer
# The commit hook spawns the lenses on 1 alone, over the range it is handed here. A
# pending finding is work for the reader, and a fresh pass over it would repeat at
# every commit forever.
#
# Operates on the working directory rather than its own location, so the probe can
# run it inside a throwaway repository.

set -uo pipefail

base_ref=${1:-main}
log=.claude/review-log.jsonl

git rev-parse --git-dir >/dev/null 2>&1 || { printf 'Not a git repository.\n' >&2; exit 3; }
command -v jq >/dev/null 2>&1 || { printf 'jq is needed to read the review log.\n' >&2; exit 3; }

head=$(git rev-parse HEAD 2>/dev/null) || exit 3
base=$(git merge-base "$base_ref" HEAD 2>/dev/null) || {
  printf 'No merge base between %s and HEAD.\n' "$base_ref" >&2
  exit 3
}

if [ -s "$log" ]; then
  pending=$(jq -rs 'map(select((.kind // "finding") != "pass" and (.outcome // "") == "")) | length' "$log" 2>/dev/null) || {
    printf 'The review log is not readable as JSON lines: %s\n' "$log" >&2
    exit 3
  }
  if [ "$pending" -gt 0 ]; then
    printf '%s finding(s) in %s carry no outcome. Fix or dismiss each one first.\n' "$pending" "$log" >&2
    exit 2
  fi

  # A dismissal without a stated reason is indistinguishable from a finding nobody
  # answered, which is the one disposal a log cannot tell apart from silence.
  unreasoned=$(jq -rs 'map(select(.outcome == "dismissed" and (.reason // "") == "")) | length' "$log" 2>/dev/null || printf 0)
  if [ "$unreasoned" -gt 0 ]; then
    printf '%s dismissal(s) in %s carry no reason. A dismissal states why.\n' "$unreasoned" "$log" >&2
    exit 2
  fi
fi

[ "$base" = "$head" ] && { printf 'review coverage: no commits over %s\n' "$base_ref"; exit 0; }

# The branch, once. Everything below is bounded by its length rather than by how
# many passes the log has accumulated since the repository began.
branch_commits=$(git rev-list "$base".."$head" 2>/dev/null)

# A pass counts only if it read commits on this branch. A pass naming a sha that no
# longer resolves, after a rebase or from a template never filled in, counts as no
# pass at all: skipping only the half that fails would let an unresolvable base
# cover the whole branch.
covered=
while IFS=' ' read -r pass_base pass_head; do
  [ -z "$pass_head" ] && continue
  case "$branch_commits" in *"$pass_head"*) ;; *) continue ;; esac
  git cat-file -e "${pass_base}^{commit}" 2>/dev/null || continue
  covered="$covered$(git rev-list "$pass_base".."$pass_head" 2>/dev/null)
"
done <<< "$(jq -rs 'map(select(.kind == "pass")) | .[] | "\(.base) \(.head)"' "$log" 2>/dev/null || true)"

# Markdown answers to the conformity reviewer, and the log is how a pass records
# itself, so a commit touching nothing else is one the lenses have no reason to read.
exempt='\.md$|^\.claude/review-log\.jsonl$'

# One process per commit, asking git for paths by sha rather than parsing a stream
# where a file named like a sha would read as a commit boundary.
uncovered=()
while IFS= read -r commit; do
  [ -z "$commit" ] && continue
  case "$covered" in *"$commit"*) continue ;; esac
  [ -z "$(git diff-tree --no-commit-id --name-only -r "$commit" 2>/dev/null | grep -Ev "$exempt")" ] && continue
  uncovered+=("$commit")
done <<< "$branch_commits"

if [ "${#uncovered[@]}" -gt 0 ]; then
  # Oldest first, so the range handed to the lenses starts before the first thing
  # they have not read rather than at the branch point every time.
  oldest=${uncovered[$((${#uncovered[@]} - 1))]}
  from=$(git rev-parse "${oldest}^" 2>/dev/null) || from=$base
  printf 'range %s %s\n' "$from" "$head"

  printf 'No review pass has read %s commit(s) on this branch:\n' "${#uncovered[@]}" >&2
  for commit in "${uncovered[@]}"; do
    printf '  %s %s\n' "${commit:0:8}" "$(git log -1 --format=%s "$commit")" >&2
  done
  printf '\nRun /pre-pr over %s..%s, then record the pass in %s.\n' "${from:0:8}" "${head:0:8}" "$log" >&2
  exit 1
fi

echo "review coverage: proven"
