#!/bin/bash
# Proves check-review-coverage.sh refuses what it claims to refuse, rather than
# trusting that it does. A coverage check that accepts everything is
# indistinguishable from a reviewed branch, which is the failure it exists to catch.
#
# Builds a throwaway repository per case, runs the check inside it, expects a verdict.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

checker=$PWD/scripts/check-review-coverage.sh
work=$(mktemp -d)
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

fail=0

# A repository holding one commit on main, then the named files on a branch.
scaffold() {
  local repo=$work/$1
  rm -rf "$repo"
  mkdir -p "$repo/.claude"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email probe@example.com
  git -C "$repo" config user.name probe
  printf 'base\n' > "$repo/README.md"
  git -C "$repo" add -A
  git -C "$repo" commit -qm 'chore: base'
  git -C "$repo" checkout -q -b branch
  printf '%s' "$repo"
}

# The content matters only where a case needs two branches to disagree on one file,
# so it is optional and random otherwise.
commit_file() {
  local repo=$1 path=$2 content=${3:-content $RANDOM}
  mkdir -p "$repo/$(dirname "$path")"
  printf '%s\n' "$content" > "$repo/$path"
  git -C "$repo" add -A >/dev/null 2>&1
  git -C "$repo" commit -qm "feat: $path" >/dev/null 2>&1
}

expect() {
  local label=$1 repo=$2 want=$3
  local got
  (cd "$repo" && bash "$checker" main >/dev/null 2>&1)
  got=$?
  if [ "$got" != "$want" ]; then
    printf 'probe "%s": expected exit %s, got %s\n' "$label" "$want" "$got" >&2
    fail=1
  fi
}

# Code nobody recorded reading is the whole point.
repo=$(scaffold unreviewed)
commit_file "$repo" src/a.ts
expect 'code with no pass record' "$repo" 1

# The same range, recorded, is the only way through.
repo=$(scaffold reviewed)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' \
  "$base" "$head" > "$repo/.claude/review-log.jsonl"
expect 'code covered by a pass record' "$repo" 0

# Recording the pass is itself a commit, so a range that ends on bookkeeping must
# still pass. Without this the check refuses every branch it has just approved.
repo=$(scaffold bookkeeping)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' \
  "$base" "$head" > "$repo/.claude/review-log.jsonl"
git -C "$repo" add -A
git -C "$repo" commit -qm 'chore: record the review pass'
expect 'a trailing bookkeeping commit' "$repo" 0

# The lenses read code. Documents answer to the conformity reviewer instead.
repo=$(scaffold markdown)
commit_file "$repo" docs/note.md
expect 'a markdown-only range' "$repo" 0

# A finding recorded without a sort is a finding still waiting. Its own exit code,
# since a caller wants to tell it apart from code nobody has read yet.
repo=$(scaffold pending)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"branch","reviewer":"security-check","file":"src/a.ts","line":1}\n'
} > "$repo/.claude/review-log.jsonl"
expect 'a finding with no outcome' "$repo" 2

# A dismissal states why, or it is indistinguishable from a finding nobody answered.
repo=$(scaffold unreasoned-dismissal)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"branch","reviewer":"security-check","file":"src/a.ts","line":1,"outcome":"dismissed"}\n'
} > "$repo/.claude/review-log.jsonl"
expect 'a dismissal with no reason' "$repo" 2

repo=$(scaffold reasoned-dismissal)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"branch","reviewer":"security-check","file":"src/a.ts","line":1,"outcome":"dismissed","reason":"the path is unreachable from a request"}\n'
} > "$repo/.claude/review-log.jsonl"
expect 'a dismissal carrying its reason' "$repo" 0

# One log serves every branch, so a line left unsorted elsewhere is not this branch's
# merge to refuse.
repo=$(scaffold pending-elsewhere)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"other","reviewer":"security-check","file":"src/z.ts","line":1}\n'
  printf '{"date":"2026-07-29","branch":"other","reviewer":"security-check","file":"src/z.ts","line":2,"outcome":"dismissed"}\n'
} > "$repo/.claude/review-log.jsonl"
expect 'a finding and an unreasoned dismissal on another branch' "$repo" 0

# A detached head names no branch, so the scope cannot be resolved and the whole log
# answers instead. This is the state the pull request job runs in, where the strict
# reading is the one that must hold.
repo=$(scaffold pending-detached)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"other","reviewer":"security-check","file":"src/z.ts","line":1}\n'
} > "$repo/.claude/review-log.jsonl"
git -C "$repo" checkout -q --detach
expect 'a finding on another branch, read from a detached head' "$repo" 2

# A resolved merge carries lines that exist in neither parent, so no pass over either
# parent has read them. diff-tree reports no path at all for a commit with two parents
# unless asked for the combined diff, and without that the resolution passes for a
# commit touching nothing. Both parents are covered here, so only the merge is unread
# and the verdict cannot come from anything else.
two_covered_parents() {
  local repo=$1 side_shared=$2
  local ours theirs mbase
  commit_file "$repo" src/shared.ts ours
  ours=$(git -C "$repo" rev-parse HEAD)
  git -C "$repo" checkout -q -b side main >/dev/null 2>&1
  commit_file "$repo" src/other.ts theirs
  [ -n "$side_shared" ] && commit_file "$repo" src/shared.ts "$side_shared"
  theirs=$(git -C "$repo" rev-parse HEAD)
  mbase=$(git -C "$repo" rev-parse main)
  {
    printf '{"date":"2026-07-30","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$mbase" "$ours"
    printf '{"date":"2026-07-30","branch":"side","kind":"pass","base":"%s","head":"%s"}\n' "$mbase" "$theirs"
  } > "$repo/.claude/review-log.jsonl"
  git -C "$repo" checkout -q branch >/dev/null 2>&1
}

repo=$(scaffold merge-resolved)
two_covered_parents "$repo" theirs
git -C "$repo" merge --no-ff side -m 'chore: merge side' >/dev/null 2>&1
printf 'resolved by hand\n' > "$repo/src/shared.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -qm 'chore: merge side' >/dev/null 2>&1
expect 'a merge whose resolution no pass has read' "$repo" 1

repo=$(scaffold merge-clean)
two_covered_parents "$repo" ''
git -C "$repo" merge --no-ff side -m 'chore: merge side' >/dev/null 2>&1
expect 'a clean merge, which introduces nothing of its own' "$repo" 0

# The instructions are markdown too, and exempting them would leave the file able to
# disarm a lens as the file no lens has to read.
repo=$(scaffold instructions-markdown)
commit_file "$repo" AGENTS.md
expect 'a commit touching only AGENTS.md' "$repo" 1

# The tool loads a CLAUDE.md from any directory it works in, so a nested one is live
# instruction and not the prose its path suggests.
repo=$(scaffold instructions-nested)
commit_file "$repo" src/core/CLAUDE.md
expect 'a commit touching only a nested CLAUDE.md' "$repo" 1

# Spelling must not buy the exemption that nesting used to, this platform resolving
# the name without regard to case.
repo=$(scaffold instructions-lowercase)
commit_file "$repo" docs/claude.md
expect 'a commit touching only a lower-case claude.md' "$repo" 1

# Prose is any markdown that is not an instruction, wherever it sits, so a document
# added at the root or outside docs/ is exempt without anyone widening a list.
repo=$(scaffold prose-anywhere)
commit_file "$repo" NOTES.md
commit_file "$repo" notes/deep/thought.md
expect 'markdown at the root and outside docs' "$repo" 0

repo=$(scaffold prose-markdown)
commit_file "$repo" docs/framing.md
expect 'a commit touching only prose under docs' "$repo" 0

# A pass naming a sha that does not resolve is no pass. Skipping only the half that
# fails would let a template nobody filled in cover the whole branch.
repo=$(scaffold unresolvable-base)
commit_file "$repo" src/a.ts
commit_file "$repo" src/b.ts
head=$(git -C "$repo" rev-parse HEAD)
printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"<merge-base>","head":"%s"}\n' \
  "$head" > "$repo/.claude/review-log.jsonl"
expect 'a pass whose base does not resolve' "$repo" 1

repo=$(scaffold unresolvable-head)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"0000000000000000000000000000000000000000"}\n' \
  "$base" > "$repo/.claude/review-log.jsonl"
expect 'a pass whose head does not resolve' "$repo" 1

# A log line that is not JSON refuses rather than passing, and says so as an
# environment failure rather than as uncovered code.
repo=$(scaffold malformed)
commit_file "$repo" src/a.ts
printf 'not json at all\n' > "$repo/.claude/review-log.jsonl"
expect 'a log line that is not JSON' "$repo" 3

# A file whose name reads like a sha must not be able to pass for a commit boundary
# and carry the code beside it out of the range.
repo=$(scaffold hex-named-file)
mkdir -p "$repo/src"
printf 'code\n' > "$repo/src/a.ts"
printf 'x\n' > "$repo/0000000000000000000000000000000000000001"
git -C "$repo" add -A
git -C "$repo" commit -qm 'feat: code beside a file named like a sha'
expect 'a file named like a sha' "$repo" 1

# A commit mixing code and markdown is a commit of code.
repo=$(scaffold mixed)
mkdir -p "$repo/src"
printf 'x\n' > "$repo/src/a.ts"
printf 'y\n' > "$repo/note.md"
git -C "$repo" add -A
git -C "$repo" commit -qm 'feat: both'
expect 'a commit mixing code and markdown' "$repo" 1

# Code committed after the pass read the range is code nobody read.
repo=$(scaffold appended)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' \
  "$base" "$head" > "$repo/.claude/review-log.jsonl"
git -C "$repo" add -A
git -C "$repo" commit -qm 'chore: record the review pass'
commit_file "$repo" src/b.ts
expect 'code committed after the pass' "$repo" 1

[ "$fail" -eq 0 ] && echo "review coverage: proven"
exit "$fail"
