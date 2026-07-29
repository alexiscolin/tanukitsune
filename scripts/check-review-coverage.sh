#!/bin/bash
# Refuses a range of code that no review pass recorded reading, and a finding left
# without a sort. Runs from the pre-PR hook and from the pull request job, so what
# reports locally and what blocks a merge cannot drift apart.
#
# Exit codes are distinct because the callers want different questions answered:
#   0  every commit of code is covered and nothing is pending
#   1  code no pass has read
#   2  a finding with no outcome
#   3  the environment or the log cannot answer
# Nothing spawns a model from here. The lenses are run deliberately through /pre-pr,
# and this is what refuses the merge when nobody has.
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

# Every branch appends to one log, so a finding left unsorted on another branch is not
# this branch's merge to refuse. A detached head names no branch, and the whole log is
# then the conservative answer for the job that blocks the merge.
branch=$(git branch --show-current 2>/dev/null || true)

if [ -s "$log" ]; then
  pending=$(jq -rs --arg branch "$branch" '
    map(select(($branch == "" or .branch == $branch)
               and (.kind // "finding") != "pass"
               and (.outcome // "") == "")) | length' "$log" 2>/dev/null) || {
    printf 'The review log is not readable as JSON lines: %s\n' "$log" >&2
    exit 3
  }
  if [ "$pending" -gt 0 ]; then
    printf '%s finding(s) in %s carry no outcome. Fix or dismiss each one first.\n' "$pending" "$log" >&2
    exit 2
  fi

  # A dismissal without a stated reason is indistinguishable from a finding nobody
  # answered, which is the one disposal a log cannot tell apart from silence.
  unreasoned=$(jq -rs --arg branch "$branch" '
    map(select(($branch == "" or .branch == $branch)
               and .outcome == "dismissed"
               and (.reason // "") == "")) | length' "$log" 2>/dev/null || printf 0)
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
  # --root, since a parentless commit otherwise reports no paths at all and would
  # pass for one touching nothing, which is the one commit no pass has ever read.
  [ -z "$(git diff-tree --root --no-commit-id --name-only -r "$commit" 2>/dev/null | grep -Ev "$exempt")" ] && continue
  uncovered+=("$commit")
done <<< "$branch_commits"

if [ "${#uncovered[@]}" -gt 0 ]; then
  # Oldest first, so the range handed to the lenses starts before the first thing
  # they have not read rather than at the branch point every time.
  oldest=${uncovered[$((${#uncovered[@]} - 1))]}
  from=$(git rev-parse "${oldest}^" 2>/dev/null) || from=$base

  # One stream, because the only reader left is a person: this refuses a merge from
  # a required job, where a machine-readable line on stdout would interleave with
  # the sentence explaining it and leave neither legible.
  printf 'No review pass has read %s commit(s) on this branch:\n' "${#uncovered[@]}" >&2
  for commit in "${uncovered[@]}"; do
    printf '  %s %s\n' "${commit:0:8}" "$(git log -1 --format=%s "$commit")" >&2
  done
  printf '\nThe merge is refused until they have been read. Run /pre-pr over\n' >&2
  printf '%s..%s, record the pass in %s, and push it.\n' "${from:0:8}" "${head:0:8}" "$log" >&2
  exit 1
fi

echo "review coverage: proven"
