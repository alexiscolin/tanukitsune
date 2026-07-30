#!/bin/bash
# Proves check-test-strength.sh refuses what it claims to refuse, rather than trusting
# that it does. A gate that accepts every range is indistinguishable from a branch that
# never weakened a test, which is the failure it exists to catch.
#
# Builds a throwaway repository per case, runs the check inside it, expects a verdict.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

checker=$PWD/scripts/check-test-strength.sh
work=$(mktemp -d)
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

fail=0

# A repository holding one test file on main, then a branch to change it on.
scaffold() {
  local repo=$work/$1 baseline=$2
  rm -rf "$repo"
  mkdir -p "$repo/src"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email probe@example.com
  git -C "$repo" config user.name probe
  printf '%s' "$baseline" > "$repo/src/a.test.ts"
  git -C "$repo" add -A
  git -C "$repo" commit -qm 'test: base'
  git -C "$repo" checkout -q -b branch
  printf '%s' "$repo"
}

commit_test() {
  local repo=$1 path=$2 content=$3
  mkdir -p "$repo/$(dirname "$path")"
  printf '%s' "$content" > "$repo/$path"
  git -C "$repo" add -A >/dev/null 2>&1
  git -C "$repo" commit -qm "test: $path" >/dev/null 2>&1
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

two="it('a', () => { expect(1).toBe(1); expect(2).toBe(2) })"$'\n'
one="it('a', () => { expect(1).toBe(1) })"$'\n'
three="$two""it('b', () => { expect(3).toBe(3) })"$'\n'

# The case the gate exists for: the same file, one assertion fewer.
repo=$(scaffold lost "$two")
commit_test "$repo" src/a.test.ts "$one"
expect 'a test file losing an assertion' "$repo" 1

# Growing a test is the ordinary case and must stay silent.
repo=$(scaffold grown "$two")
commit_test "$repo" src/a.test.ts "$three"
expect 'a test file gaining an assertion' "$repo" 0

# A file the range introduces has no baseline, however few assertions it carries.
repo=$(scaffold introduced "$two")
commit_test "$repo" src/b.test.ts "$one"
expect 'a new test file with fewer assertions than its neighbour' "$repo" 0

# Editing a test alongside its implementation is allowed while the count holds, which
# is the distinction the rule draws and a linter cannot.
repo=$(scaffold renamed "$two")
commit_test "$repo" src/a.test.ts "${two/expect(1)/expect(renamed)}"
expect 'a test edited without losing an assertion' "$repo" 0

# Skipping is the other half of the same failure, and it keeps the count intact.
repo=$(scaffold skipped "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.skip(}"
expect 'a skipped test' "$repo" 2

# Focusing hides every other case in the file while the count holds.
repo=$(scaffold focused "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.only(}"
expect 'a focused test' "$repo" 2

# A reduction the range explains is a decision rather than a loss, and the trailer is
# what tells the two apart.
repo=$(scaffold declared "$two")
printf '%s' "$one" > "$repo/src/a.test.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -q -m 'refactor: assert the object once' \
  -m 'Assertions-reduced: src/a.test.ts one toEqual asserts more than two toBe'
expect 'a reduction the range declares' "$repo" 0

# A trailer naming another file does not cover this one.
repo=$(scaffold misdeclared "$two")
printf '%s' "$one" > "$repo/src/a.test.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -q -m 'refactor: assert the object once' \
  -m 'Assertions-reduced: src/other.test.ts unrelated'
expect 'a reduction declared for another file' "$repo" 1

# A range with no test file in it has nothing to judge.
repo=$(scaffold untouched "$two")
commit_test "$repo" src/a.ts 'export const A = 1'
expect 'a range touching no test file' "$repo" 0

# Deleting a test file is a slice rather than a weakening, and telling the two apart
# needs the module it covered.
repo=$(scaffold deleted "$two")
git -C "$repo" rm -q src/a.test.ts && git -C "$repo" commit -qm 'test: remove'
expect 'a deleted test file' "$repo" 0

[ "$fail" -eq 0 ] && echo "test strength: proven"
exit "$fail"
