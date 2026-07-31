#!/bin/bash
# Proves the token rule refuses what it claims to, rather than trusting that it does.
# A rule that matches nothing passes every lint and reads as a guard in place.
#
# Three probes into src/ui/, because the rule has to hold on all three: an arbitrary
# value written in the attribute, the same written into a constant the attribute reads,
# and the custom-property form the codebase already uses, which must stay legal. The
# middle one is the reason the rule reads every string literal instead of only the
# attributes: classes live in constants in src/ui/review-session.tsx, and a rule
# scoped to JSX would pass a constant holding p-[13px] in silence.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Under src/, so the file lands where the rule matches and where the type service
# resolves it. Removed before anything else in the gate enumerates the directory.
probe_dir=src/ui
probe_prefix=__token-probe-
inline=$probe_dir/${probe_prefix}inline.tsx
constant=$probe_dir/${probe_prefix}constant.tsx
allowed=$probe_dir/${probe_prefix}allowed.tsx

cleanup() { rm -f "$inline" "$constant" "$allowed"; }
trap cleanup EXIT

fail=0
RULE=no-restricted-syntax

# Named as a violation of the rule rather than as any failure: the probes are valid
# TypeScript and break nothing else, so a lint failing for another reason would
# otherwise be read as the rule firing.
# Matched on a captured string rather than through a pipe into grep: under pipefail,
# grep -q closes the tube on its first hit, eslint dies on SIGPIPE, and the pipeline
# reports 141 for the case that just succeeded.
refuses() {
  local file="$1" what="$2" out
  out=$(./node_modules/.bin/eslint "$file" 2>&1)
  case "$out" in
    *"$RULE"*) return 0 ;;
  esac
  printf '%s did not refuse %s.\n' "$RULE" "$what" >&2
  fail=1
}

printf 'export function TokenProbe() {\n  return <p className="p-[13px]">probe</p>\n}\n' > "$inline"
refuses "$inline" 'an arbitrary value in a class attribute'

printf "const CARD = 'text-[#ffffff]'\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n" > "$constant"
refuses "$constant" 'an arbitrary value held in a constant'

# Exit code rather than a rule name: this one proves the probe is clean outright, so a
# rule written too broadly is caught here instead of surfacing as a puzzling lint later.
printf 'export function TokenProbe() {\n  return <p className="text-[var(--color-ink)]">probe</p>\n}\n' > "$allowed"
if ! ./node_modules/.bin/eslint "$allowed" > /dev/null 2>&1; then
  printf 'The custom-property form is refused, and it is the form the codebase writes.\n' >&2
  fail=1
fi

[ "$fail" -eq 0 ] && echo "tokens: proven"
exit "$fail"
