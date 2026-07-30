#!/bin/bash
# Refuses a range that weakens its own tests. Runs from the pull request job, and by
# hand whenever the state is in question. Nothing calls a model from here.
#
# `red before green` is the rule this repository holds best and outallows least: the
# failing test is committed before the implementation and never edited to reach green.
# A commit that edits a test alongside the code it covers is allowed: a rename carried by
# a refactor is that. What is never allowed is the same edit taking an assertion away in
# silence, and no linter can tell the two apart.
#
# The published detection signal for the same failure, only test files changed
# alongside a failing check, does not apply here: tests change with their
# implementation as a matter of course. Assertion count does apply, and it is the
# discriminator this reads.
#
# Exit codes are distinct so the probe can tell the refusals apart:
#   0  no test file lost an assertion, and none is skipped
#   1  a test file that still exists holds fewer assertions than it did
#   2  a unit test is disabled, focused, or made conditional
#   3  the environment cannot answer
#
# A lint rule disabled in the range is deliberately not read: `eslint-disable` has
# legitimate uses, none occurs in this repository today, and refusing a pattern that
# does not occur buys a false sense of coverage.
#
# Operates on the working directory rather than its own location, so the probe can run
# it inside a throwaway repository. Reads committed state through `git show` rather
# than the worktree, so what it judges is what a merge would take.

set -uo pipefail

base_ref=${1:-main}

git rev-parse --git-dir >/dev/null 2>&1 || { printf 'Not a git repository.\n' >&2; exit 3; }
base=$(git merge-base "$base_ref" HEAD 2>/dev/null) || {
  printf 'No merge base between %s and HEAD.\n' "$base_ref" >&2
  exit 3
}
head=$(git rev-parse HEAD 2>/dev/null) || exit 3

[ "$base" = "$head" ] && { printf 'test strength: no commits over %s\n' "$base_ref"; exit 0; }

# Counted on the assertion call rather than on the test case, because a case can lose
# every assertion and still be a case, which is the shape this refuses. Counted per
# occurrence and not per line: `grep -c` counts matching lines, and two assertions
# sharing a line would then hide the loss of one.
assertions() { grep -o 'expect(' 2>/dev/null | wc -l | tr -d ' ' || true; }

# A reduction is sometimes the right change: two assertions folded into one `toEqual`
# assert more than they did, and refusing that would block correct work, which is worse
# than not gating at all. So the count below is lifted when a commit in the range names
# the file in a `Test-weakened:` trailer. The marker refusal is not: see its own note.
# The trailer is read from the whole range, since the commit that reduces and the commit
# that explains need not be the same one.
# Only the first field is read as the path, and it is matched whole: the rest of the
# line is the reason, free text, and a reason naming a second test file would
# otherwise open that file too.
declared=$(git log --format=%B "$base..$head" \
  | sed -n 's/^Test-weakened:[[:space:]]*//p' | awk '{print $1}')

# Every chainable form that leaves the body in place, so the count cannot see it.
disabled='\b(it|test|describe)\.(skip|only|fixme|skipIf|runIf|todo)\b'

weakened=''
skipped=''

# `--name-status -M25% -z` rather than `--name-only`: a rename reaches the plain form as
# a deletion plus an addition, and each half is then skipped for having no counterpart,
# so renaming a test file while emptying it passed the gate entirely. The threshold is
# lowered from git's default of 50 percent because that default excludes the case this
# exists to catch: a test file renamed while it loses half its assertions is under half
# similar by construction. A quarter still requires the pairing to be evidence. `-z` also turns off
# the C-quoting git applies to a path holding a non-ASCII byte, and this product is
# written in French and teaches Japanese, so an accented or kana test name is content
# rather than an edge case. A quoted path failed `git cat-file` and was dropped, which
# opened the same hole without a rename.
while IFS= read -r -d '' status; do
  case $status in
    R*) IFS= read -r -d '' was; IFS= read -r -d '' f ;;
    D*) IFS= read -r -d '' f; continue ;;
    *)  IFS= read -r -d '' f; was=$f ;;
  esac
  # `D` is the only status whose path is absent from head, and it left above.
  [ -n "$f" ] || continue

  # Read once and held: both checks below read the same blob, and fetching it twice
  # doubles the git round trips per file for nothing.
  current=$(git show "$head:$f")

  # Read before the baseline is required, so a test file the range introduces cannot
  # carry a skipped case through: the count needs two sides, the marker needs one.
  # `skipIf`, `runIf` and `todo` keep the body, so the count below cannot see them, and
  # one `describe.skipIf(true)` neutralises a whole file.
  #
  # Absolute, and scoped to `*.test.*` rather than lifted by the trailer. The two
  # refusals have different shapes: the count is a delta between two sides, so declaring
  # it waives a bounded amount and the reduced count becomes the next baseline. A marker
  # is a state read of the file at head, so one declaration would also lift a marker a
  # later commit adds, and would be demanded again by every range that touches the file
  # afterwards. A Playwright spec guarding a browser it cannot serve is the case that
  # asked for an escape, and `e2e/*.spec.*` is where those live, so scope answers it
  # without coupling the two. `.only` there is refused by `forbidOnly` in the
  # Playwright config.
  case $f in
    *.test.ts|*.test.tsx)
      if printf '%s' "$current" | grep -qE "$disabled"; then
        skipped+=$(printf '  %s\n' "$f")
      fi
      ;;
  esac

  # A file the range introduces has no baseline to fall below. A rename carries its
  # baseline under the name it had.
  git cat-file -e "$base:$was" 2>/dev/null || continue

  before=$(git show "$base:$was" | assertions)
  after=$(printf '%s' "$current" | assertions)
  if [ "$after" -lt "$before" ] && ! printf '%s\n' "$declared" | grep -qxF -- "$f"; then
    weakened+=$(printf '  %s: %s assertions, was %s\n' "$f" "$after" "$before")
  fi
done < <(git diff --name-status -M25% -z "$base..$head" -- \
  '*.test.ts' '*.test.tsx' '*.spec.ts' '*.spec.tsx')

if [ -n "$weakened" ]; then
  printf 'A test file lost assertions in this range:\n%s\n' "$weakened" >&2
  printf 'A test that has to change to pass means the plan was wrong. If the reduction is the\n' >&2
  printf 'right change, say so in a commit: `Test-weakened: <path> <reason>`.\n' >&2
  exit 1
fi

if [ -n "$skipped" ]; then
  printf 'A unit test is disabled, focused, or made conditional:\n%s\n' "$skipped" >&2
  printf 'A conditional guard belongs in an e2e spec, which this does not read.\n' >&2
  exit 2
fi

echo "test strength: no assertion lost"
