#!/bin/bash
# Proves the token rule refuses what it claims to and nothing beside it. A rule that
# matches nothing passes every lint and reads as a guard in place; one that matches too
# much is worked around until it is deleted. What the rule is, and which shapes are legal
# on purpose, is in docs/verification.md under the token rule.
#
# Writes four probes into src/ui/, expects a refusal for three, expects the fourth to pass
# whole, removes them.
#
# Unlike scripts/check-boundaries.sh, these probes cannot be excluded from tsconfig.json or
# from eslint.config.js: the type-aware lint reads a file only from inside the project, and
# reading them is the point. So a probe surviving a killed run breaks the next gate, which
# is what the trap prevents.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

probe_dir=src/ui
probe_prefix=__token-probe-
inline=$probe_dir/${probe_prefix}inline.tsx
constant=$probe_dir/${probe_prefix}constant.tsx
template=$probe_dir/${probe_prefix}template.tsx
allowed=$probe_dir/${probe_prefix}allowed.tsx

cleanup() { rm -f "$inline" "$constant" "$template" "$allowed"; }
trap cleanup EXIT

fail=0

# The rule is named by the opening of its message, because the id alone is shared with
# every other entry the same rule will ever carry. That the configuration still opens with
# it is asserted rather than hoped for, the way check-boundaries.sh asserts the exclusions
# it depends on: without this, rewording a sentence written for a human would make the gate
# report that the rule stopped refusing what it still refuses.
opening='Arbitrary value.'
if ! grep -qF "'$opening" eslint.config.js; then
  printf 'The token message in eslint.config.js no longer opens with %s, so nothing here can name the rule apart from its neighbours.\n' "$opening" >&2
  exit 1
fi

printf 'export function TokenProbe() {\n  return <p className="p-[13px]">probe</p>\n}\n' > "$inline"
printf "const CARD = 'text-[#ffffff]'\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n" > "$constant"
printf 'const CARD = `gap-[7px]`\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n' > "$template"
printf 'export function TokenProbe() {\n  return (\n    <p className="text-[var(--color-ink)] w-[calc(var(--spacing-loose)*2)] data-[theme=dark]:underline">\n      probe\n    </p>\n  )\n}\n' > "$allowed"

# One invocation rather than one per probe: the type-aware configuration builds a project
# graph on startup, which is most of a lint's cost and about five seconds over four files.
report=$(./node_modules/.bin/eslint -f json "$inline" "$constant" "$template" "$allowed")

if ! printf '%s' "$report" | jq -e . > /dev/null 2>&1; then
  printf 'The lint produced no report, so the probes prove nothing.\n' >&2
  exit 1
fi

# Matched on the rule rather than on the file: asking only whether the linter spoke about a
# probe passes under any rule that happens to flag it, token rule or not.
refuses() {
  printf '%s' "$report" | jq -e --arg f "$1" --arg m "$opening" '
    any(.[]; (.filePath | endswith($f)) and any(.messages[];
      .ruleId == "no-restricted-syntax" and (.message | startswith($m))))' > /dev/null
}

for spec in "$inline:an arbitrary value in a class attribute" \
            "$constant:an arbitrary value held in a constant" \
            "$template:an arbitrary value written as a template"; do
  refuses "${spec%%:*}" && continue
  printf 'The token rule did not refuse %s.\n' "${spec#*:}" >&2
  fail=1
done

if refuses "$allowed"; then
  printf 'The token rule refuses a token, a token reached through calc, or a variant, and all three are legal.\n' >&2
  fail=1
fi

[ "$fail" -eq 0 ] && echo "tokens: proven"
exit "$fail"
