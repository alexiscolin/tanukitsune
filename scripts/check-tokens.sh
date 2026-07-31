#!/bin/bash
# Proves the token rule refuses what it claims to and nothing beside it. A rule that
# matches nothing passes every lint and reads as a guard in place; one that matches too
# much is worked around until it is deleted. What the rule is, and which shapes are legal
# on purpose, is in docs/verification.md under the token rule.
#
# Four probes, one lint. Three must be refused: an arbitrary value in the attribute, the
# same held in a constant, the same written as a template. The fourth must pass whole, and
# it carries the three legal shapes.
#
# Unlike scripts/check-boundaries.sh, these probes cannot be excluded from tsconfig.json
# or from eslint.config.js: the type-aware lint reads a file only from inside the project,
# and reading them is the point. So a probe surviving a killed run breaks the next gate
# until it is deleted, which the trap below is what prevents.

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

printf 'export function TokenProbe() {\n  return <p className="p-[13px]">probe</p>\n}\n' > "$inline"
printf "const CARD = 'text-[#ffffff]'\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n" > "$constant"
printf 'const CARD = `gap-[7px]`\n\nexport function TokenProbe() {\n  return <p className={CARD}>probe</p>\n}\n' > "$template"
printf 'export function TokenProbe() {\n  return (\n    <p className="text-[var(--color-ink)] w-[calc(var(--spacing-loose)*2)] data-[theme=dark]:underline">\n      probe\n    </p>\n  )\n}\n' > "$allowed"

# One invocation rather than one per probe: the type-aware configuration builds a project
# graph on startup, which is most of a lint's cost, and paying it four times proves nothing
# a single pass does not.
#
# JSON rather than the readable formatter, and matched on the rule and its message rather
# than on the file: a probe that only asks whether the linter spoke about a file passes
# under any rule that happens to flag it, so it would keep printing proven with the token
# rule replaced by one that has nothing to do with tokens.
report=$(./node_modules/.bin/eslint -f json "$inline" "$constant" "$template" "$allowed" 2>/dev/null)

REFUSED='an arbitrary value in a class attribute
an arbitrary value held in a constant
an arbitrary value written as a template'

node -e '
const [report, inline, constant, template, allowed] = process.argv.slice(1)
const labels = process.argv[6].split("\n")
const results = JSON.parse(report)
const failures = []

const refusals = (file) =>
  (results.find((r) => r.filePath.endsWith(file))?.messages ?? []).filter(
    (m) => m.ruleId === "no-restricted-syntax" && m.message.startsWith("Arbitrary value."),
  )

for (const [i, file] of [inline, constant, template].entries()) {
  if (refusals(file).length === 0) failures.push(`The token rule did not refuse ${labels[i]}.`)
}

if (refusals(allowed).length > 0) {
  failures.push(
    "The token rule refuses a token, a token reached through calc, or a variant, and all three are legal.",
  )
}

for (const line of failures) console.error(line)
process.exit(failures.length === 0 ? 0 : 1)
' "$report" "$inline" "$constant" "$template" "$allowed" "$REFUSED" || exit 1

echo "tokens: proven"
