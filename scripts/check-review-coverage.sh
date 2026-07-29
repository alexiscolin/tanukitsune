#!/bin/bash
# Refuses a range of code that no review pass recorded reading, and a finding left
# without a sort. Runs from the pull request job, and by hand whenever the state is
# in question. Nothing calls a model from here.
#
# A run on a branch counts that branch's unsorted findings; a run on a detached head
# names no branch and counts the whole log. The job runs detached, so it is the
# stricter of the two readings and never the looser: what it refuses, a run by hand on
# the branch may have let through, but never the reverse.
#
# Exit codes are distinct so the probe can tell the refusals apart, and so a person
# reading `$?` can:
#   0  every commit of code is covered and nothing is pending
#   1  code no pass has read
#   2  a finding with no outcome
#   3  the environment or the log cannot answer
# The lenses are run deliberately through /pre-pr, and this is what refuses the merge
# when nobody has.
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

# Prose answers to the conformity reviewer, and the log is how a pass records itself,
# so a commit touching nothing else is one the code lenses have no reason to read.
prose='\.md$|^\.claude/review-log\.jsonl$'

# Named back in, because the instructions are prose too and must not be exempt.
# AGENTS.md, CLAUDE.md and everything under .claude/ tell a later session what it may
# do and tell each lens what to look for, so exempting them would leave the one file
# able to disarm a reviewer as the one file no reviewer has to see. Whether the
# conformity reviewer ran is a judgement; whether these were read is not.
#
# Stated as the closed set rather than as the open one: every document that is not an
# instruction is prose, so a file added at the root or a directory added under docs/
# falls on the safe side by default instead of buying an alternation here.
#
# Unanchored on the name, because the tool loads a CLAUDE.md from any directory it is
# working in, so a nested one is live instruction for every later session and not the
# prose its path would suggest.
instructions='(^|/)(AGENTS|CLAUDE|REVIEW)\.md$|(^|/)\.claude/.*\.md$'

# One process per commit, asking git for paths by sha rather than parsing a stream
# where a file named like a sha would read as a commit boundary.
uncovered=()
while IFS= read -r commit; do
  [ -z "$commit" ] && continue
  case "$covered" in *"$commit"*) continue ;; esac
  # diff-tree describes a commit against exactly one parent, so it names nothing for
  # a commit that has none and nothing for one that has two. --root and --cc answer
  # both arities: --cc names what a merge introduces that is in neither parent, which
  # is the conflict resolution, so a clean merge still has nothing to read while a
  # resolved one carries lines that exist in no other commit of the range.
  paths=$(git diff-tree --root --cc --no-commit-id --name-only -r "$commit" 2>/dev/null)
  read_by_lenses=$(printf '%s\n' "$paths" | grep -Ev "$prose"; printf '%s\n' "$paths" | grep -E "$instructions")
  [ -z "$(printf '%s' "$read_by_lenses" | tr -d '[:space:]')" ] && continue
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
    # Capped, because a subject is author-controlled text and this refusal is read in a
    # CI log where one long line pushes the sentence that explains it out of view. The
    # convention already holds a subject under 72 characters.
    subject=$(git log -1 --format=%s "$commit")
    printf '  %s %s\n' "${commit:0:8}" "${subject:0:72}" >&2
  done
  printf '\nThe merge is refused until they have been read. Run /pre-pr over\n' >&2
  printf '%s..%s, record the pass in %s, and push it.\n' "${from:0:8}" "${head:0:8}" "$log" >&2
  exit 1
fi

echo "review coverage: proven"
