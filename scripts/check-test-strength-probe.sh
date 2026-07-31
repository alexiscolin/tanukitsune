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
  local repo=$work/$1 baseline=$2 second=${3:-}
  rm -rf "$repo"
  mkdir -p "$repo/src"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email probe@example.com
  git -C "$repo" config user.name probe
  # Signing off for the reason scripts/check-review-coverage-probe.sh gives.
  git -C "$repo" config commit.gpgsign false
  printf '%s' "$baseline" > "$repo/src/a.test.ts"
  [ -n "$second" ] && printf '%s' "$second" > "$repo/src/b.test.ts"
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

# Four cases commit a trailer, which `commit_test` cannot carry: it takes one message.
commit_declared() {
  local repo=$1 path=$2 content=$3 subject=$4 trailer=$5
  printf '%s' "$content" > "$repo/$path"
  git -C "$repo" add -A >/dev/null 2>&1
  git -C "$repo" commit -q -m "$subject" -m "$trailer" >/dev/null 2>&1
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

# Focusing hides every other case in the file while the count holds. Kept alongside the
# skip case although both reach the same alternation: one hides a case and the other
# hides every other, so a change narrowing the pattern to one of them has to fail here.
repo=$(scaffold focused "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.only(}"
expect 'a focused test' "$repo" 2

# The third alternative the pattern carries, untested until now.
repo=$(scaffold fixme "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.fixme(}"
expect 'a test marked fixme' "$repo" 2

# A reduction the range explains is a decision rather than a loss, and the trailer is
# what tells the two apart.
repo=$(scaffold declared "$two")
commit_declared "$repo" src/a.test.ts "$one" 'refactor: assert the object once' \
  'Test-weakened: src/a.test.ts one toEqual asserts more than two toBe'
expect 'a reduction the range declares' "$repo" 0

# A trailer naming another file does not cover this one.
repo=$(scaffold misdeclared "$two")
commit_declared "$repo" src/a.test.ts "$one" 'refactor: assert the object once' \
  'Test-weakened: src/other.test.ts unrelated'
expect 'a reduction declared for another file' "$repo" 1

# A reason naming a second test file does not open it: only the first field is the
# path. Both files need a baseline, which is what the second seed is for.
repo=$(scaffold reasoned "$two" "$two")
printf '%s' "$one" > "$repo/src/b.test.ts"
commit_declared "$repo" src/a.test.ts "$one" 'refactor: fold both' \
  'Test-weakened: src/a.test.ts src/b.test.ts covers the rest now'
expect 'a reason naming a second file' "$repo" 1

# A rename carries its baseline under the name it had: emptying a test while renaming it
# reached the gate as a deletion plus an addition and passed.
repo=$(scaffold renamed_away "$three")
git -C "$repo" mv src/a.test.ts src/a.spec.ts
printf '%s' "$two" > "$repo/src/a.spec.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -qm 'refactor: rename and empty' >/dev/null 2>&1
expect 'a renamed test file losing an assertion' "$repo" 1

# A non-ASCII path is C-quoted by git unless asked otherwise, and the quoted form
# resolves to nothing, which dropped the file from the walk.
repo=$(scaffold accented "$two")
git -C "$repo" checkout -q main
printf '%s' "$two" > "$repo/src/révision.test.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -qm 'test: an accented name' >/dev/null 2>&1
git -C "$repo" checkout -q branch
git -C "$repo" merge -q main -m 'chore: take the accented file' >/dev/null 2>&1
printf '%s' "$one" > "$repo/src/révision.test.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -qm 'refactor: empty it' >/dev/null 2>&1
expect 'an accented test file losing an assertion' "$repo" 1

# A test file the range introduces carries no baseline, but a marker needs only one side.
repo=$(scaffold introduced_skip "$two")
commit_test "$repo" src/b.test.ts "${two/it(/it.skip(}"
expect 'a new test file carrying a skipped case' "$repo" 2

# `skipIf` keeps the body, so the count sees nothing: one call neutralises a file.
repo=$(scaffold conditional "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.skipIf(true)(}"
expect 'a test made conditional' "$repo" 2

# A conditional guard belongs in an e2e spec, which the marker refusal does not read:
# scope answers the Playwright case rather than a declaration that would also lift a
# marker a later commit adds.
repo=$(scaffold guarded "$two")
mkdir -p "$repo/e2e"
printf '%s' "${two/it(/it.skip(}" > "$repo/e2e/shell.spec.ts"
git -C "$repo" add -A >/dev/null 2>&1
git -C "$repo" commit -qm 'test: guard a browser' >/dev/null 2>&1
expect 'a conditional guard in an e2e spec' "$repo" 0

# `todo` keeps the body too, so the count cannot see it either.
repo=$(scaffold todo "$two")
commit_test "$repo" src/a.test.ts "${two/it(/it.todo(}"
expect 'a test marked todo' "$repo" 2

# A declaration lifts the count and not the marker, since one is a delta and the other
# a state: declaring a reduction must not license disabling the file later.
repo=$(scaffold marker_not_lifted "$two")
commit_declared "$repo" src/a.test.ts "${one/it(/it.skip(}" 'refactor: fold and disable' \
  'Test-weakened: src/a.test.ts one toEqual asserts more'
expect 'a declared reduction that also disables' "$repo" 2

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
