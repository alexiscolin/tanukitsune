#!/bin/bash
# Proves the token rule refuses what it claims to and nothing beside it, rather than
# trusting that it does. A rule that matches nothing passes every lint and reads as a
# guard in place; one that matches too much is worked around until it is deleted.
#
# Four probes into src/ui/, one lint over all four. Three must be refused: an arbitrary
# value in the attribute, the same held in a constant, and the same written as a template.
# The constant is why the rule reads every string instead of the attributes alone, classes
# being held in constants in src/ui/review-session.tsx. The fourth must pass whole, and it
# carries the three shapes that are legal on purpose: a colour token, a token that is not
# a colour, and a variant, whose bracket is followed by a colon because it selects rather
# than spending anything.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Under src/, so a probe lands where the rule matches and where the type service resolves
# it. Removed before anything else in the gate enumerates the directory.
probe_dir=src/ui
probe_prefix=__token-probe-
inline=$probe_dir/${probe_prefix}inline.tsx
constant=$probe_dir/${probe_prefix}constant.tsx
template=$probe_dir/${probe_prefix}template.tsx
allowed=$probe_dir/${probe_prefix}allowed.tsx

cleanup() { rm -f "$inline" "$constant" "$template" "$allowed"; }
trap cleanup EXIT

fail=0
RULE=no-restricted-syntax

printf 'export function TokenProbe() {\n  return <p className="p-[13px]">probe</p>\n}\n' > "$inline"
printf "const CARD = 'text-[#ffffff]'\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n" > "$constant"
printf 'const CARD = `gap-[7px]`\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n' > "$template"
printf 'export function TokenProbe() {\n  return (\n    <p className="text-[var(--color-ink)] p-[var(--spacing-loose)] data-[theme=dark]:underline">\n      probe\n    </p>\n  )\n}\n' > "$allowed"

# One invocation rather than one per probe: the type-aware configuration builds a project
# graph on startup, which is most of a lint's cost, and paying it four times proves
# nothing a single pass does not.
report=$(./node_modules/.bin/eslint "$inline" "$constant" "$template" "$allowed" 2>&1)

# Matched on a captured string rather than through a pipe into grep: under pipefail,
# grep -q closes the tube on its first hit, eslint dies on SIGPIPE, and the pipeline
# reports 141 for the case that just succeeded.
refused() {
  case "$report" in
    *"$1"*) return 0 ;;
  esac
  return 1
}

check_refused() {
  refused "$1" && return 0
  printf '%s did not refuse %s.\n' "$RULE" "$2" >&2
  fail=1
}

check_refused "$inline" 'an arbitrary value in a class attribute'
check_refused "$constant" 'an arbitrary value held in a constant'
check_refused "$template" 'an arbitrary value written as a template'

# Named rather than counted: a file with nothing to report is absent from the output, so
# its presence is the failure, and the message says which of the three legal shapes broke.
if refused "$allowed"; then
  printf 'The rule refuses a token, a token that is not a colour, or a variant, and all three are legal.\n' >&2
  fail=1
fi

if ! refused "$RULE"; then
  printf 'The lint reported nothing at all, so the probes prove nothing.\n' >&2
  fail=1
fi

[ "$fail" -eq 0 ] && echo "tokens: proven"
exit "$fail"
