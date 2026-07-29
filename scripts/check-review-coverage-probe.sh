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

commit_file() {
  local repo=$1 path=$2
  mkdir -p "$repo/$(dirname "$path")"
  printf 'content %s\n' "$RANDOM" > "$repo/$path"
  git -C "$repo" add -A
  git -C "$repo" commit -qm "feat: $path"
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
# since the commit hook must not answer it by spawning another pass.
repo=$(scaffold pending)
commit_file "$repo" src/a.ts
base=$(git -C "$repo" rev-parse main)
head=$(git -C "$repo" rev-parse HEAD)
{
  printf '{"date":"2026-07-29","branch":"branch","kind":"pass","base":"%s","head":"%s"}\n' "$base" "$head"
  printf '{"date":"2026-07-29","branch":"branch","reviewer":"security-check","file":"src/a.ts","line":1}\n'
} > "$repo/.claude/review-log.jsonl"
expect 'a finding with no outcome' "$repo" 2

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

# The hook that carries the gate to `gh pr create` recognises the invocation by its
# text, which is the part of this mechanism that has misfired rather than the maths.
gate=$PWD/.claude/hooks/pre-pr-gate.sh
opens=$(printf 'gh pr')

matches() {
  local label=$1 want=$2 payload=$3
  local got
  printf '{"tool_input":{"command":%s}}' "$(printf '%s' "$payload" | jq -Rs .)" \
    | CLAUDE_PROJECT_DIR=$work/nothing bash "$gate" >/dev/null 2>&1
  got=$?
  if [ "$got" != "$want" ]; then
    printf 'gate probe "%s": expected exit %s, got %s\n' "$label" "$want" "$got" >&2
    fail=1
  fi
}

# CLAUDE_PROJECT_DIR points nowhere, so a match exits 0 at the missing-script guard
# rather than on the verdict. What is under test here is the recognition, not the maths.
mkdir -p "$work/nothing"

matches 'an unrelated command' 0 'git status'
matches 'the invocation quoted in a double-quoted string' 0 "echo \"run $opens create later\""
matches 'the invocation quoted after an operator' 0 "grep -r 'cd x && $opens create' docs/"
matches 'a heredoc line naming it' 0 "cat <<'EOF'
$opens create --fill
EOF"

# A real invocation reaches the script and stops at the missing-script guard, which
# is exit 0 too, so recognition is asserted the only way that separates the two: by
# pointing the hook at this repository, where the script exists and refuses.
real_reaches() {
  local label=$1 payload=$2
  local got
  printf '{"tool_input":{"command":%s}}' "$(printf '%s' "$payload" | jq -Rs .)" \
    | CLAUDE_PROJECT_DIR=$PWD bash "$gate" >/dev/null 2>&1
  got=$?
  if [ "$got" != 2 ]; then
    printf 'gate probe "%s": expected the gate to refuse, got %s\n' "$label" "$got" >&2
    fail=1
  fi
}

real_reaches 'a bare invocation' "$opens create --fill"
real_reaches 'an invocation after an operator' "git push && $opens create --fill"

[ "$fail" -eq 0 ] && echo "review coverage: proven"
exit "$fail"
