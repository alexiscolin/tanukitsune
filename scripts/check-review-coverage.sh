#!/bin/bash
# Refuses a range of code that no review pass recorded reading, and a finding left
# without a sort. Runs from the commit hook, the pre-PR hook and the pull request
# job, so what reports locally and what blocks a merge cannot drift apart.
#
# Exit codes are distinct because the callers want different questions answered:
#   0  every commit of code is covered and nothing is pending
#   1  code no pass has read
#   2  a finding with no outcome
#   3  the environment or the log cannot answer
# The commit hook spawns the lenses on 1 alone. A pending finding is work for the
# reader, and spawning a fresh pass over it would repeat on every commit forever.
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
fi

[ "$base" = "$head" ] && { printf 'review coverage: no commits over %s\n' "$base_ref"; exit 0; }

# Each pass contributes the commits it read, once, rather than being retested
# against every commit. A pass naming a sha that no longer resolves, after a rebase
# or from a template never filled in, reads as no pass at all: skipping only the
# half that fails would let an unresolvable base cover the whole branch.
covered=
while IFS=' ' read -r pass_base pass_head; do
  [ -z "$pass_head" ] && continue
  git cat-file -e "${pass_base}^{commit}" 2>/dev/null || continue
  git cat-file -e "${pass_head}^{commit}" 2>/dev/null || continue
  git merge-base --is-ancestor "$pass_head" "$head" 2>/dev/null || continue
  covered="$covered$(git rev-list "$pass_base".."$pass_head" 2>/dev/null)
"
done <<< "$(jq -rs 'map(select(.kind == "pass")) | .[] | "\(.base) \(.head)"' "$log" 2>/dev/null || true)"

# Markdown answers to the conformity reviewer, and the log is how a pass records
# itself, so a commit touching nothing else is one the lenses have no reason to read.
exempt='\.md$|^\.claude/review-log\.jsonl$'

uncovered=()
commit=
carries_code=0
flush() {
  [ -z "$commit" ] && return
  [ "$carries_code" -eq 0 ] && return
  case "$covered" in *"$commit"*) return ;; esac
  uncovered+=("$commit")
}

# One walk of the range rather than two git calls per commit, so the cost follows
# the branch rather than the branch times the log.
while IFS= read -r line; do
  case "$line" in
    '') continue ;;
    ????????????????????????????????????????)
      case "$line" in
        *[!0-9a-f]*) ;;
        *) flush; commit=$line; carries_code=0; continue ;;
      esac
      ;;
  esac
  printf '%s\n' "$line" | grep -Eq "$exempt" || carries_code=1
done < <(git log --format=%H --name-only "$base".."$head" 2>/dev/null)
flush

if [ "${#uncovered[@]}" -gt 0 ]; then
  printf 'No review pass has read %s commit(s) on this branch:\n' "${#uncovered[@]}" >&2
  for commit in "${uncovered[@]}"; do
    printf '  %s %s\n' "${commit:0:8}" "$(git log -1 --format=%s "$commit")" >&2
  done
  printf '\nRun /pre-pr over %s..%s, then record the pass in %s.\n' "${base:0:8}" "${head:0:8}" "$log" >&2
  exit 1
fi

echo "review coverage: proven"
