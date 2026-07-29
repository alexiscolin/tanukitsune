#!/bin/bash
# Fails when documentation narrates its own history, addresses a reader who is
# evaluating the author, or reads as study material. Deterministic, so the rule
# does not depend on anyone remembering it.
#
# Scope: markdown outside .git and outside info/.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0
report() { printf '%s\n' "$1" >&2; fail=1; }

# One enumeration for every check. git ls-files would hide an untracked document
# from the three checks below while the two above still scanned it.
markdown() { find "$@" -name '*.md' -not -path './.git/*' -not -path './node_modules/*' \
  -not -path './.next/*' -not -path './info/*' -not -path './coverage/*'; }

# A dependency's README is not documentation this project authored.
EXCLUDED=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=info --exclude-dir=coverage)

# Narrating the document's own history. Provenance belongs in docs/agent-log.md
# and docs/decisions/, which are excluded.
narration='earlier draft|previous version|a review found|an audit found|used to say|was previously wrong|as we discussed|our conversation|in this session'

# Addressing someone evaluating the author rather than someone using the project.
positioning='hiring manager|recruiter|reads as senior|what reads as|portfolio piece|in an interview|differentiating than'

# Framing the material as something being learned rather than decided.
learning='cheat ?sheet|: a course|learned the expensive way|written to be learned|study material|revision notes'

scan() {
  local pattern="$1" label="$2"
  local hits
  # Excluded: info/, which is human-only and gitignored by design; the two places
  # provenance legitimately lives; and the two that state the rule, which have to
  # name the patterns in order to forbid them.
  hits=$(grep -rniE "$pattern" --include='*.md' "${EXCLUDED[@]}" . \
    | grep -v '^\./info/' \
    | grep -v '^\./docs/agent-log\.md:' \
    | grep -v '^\./docs/decisions/' \
    | grep -v '^\./AGENTS\.md:' \
    | grep -v '^\./\.claude/agents/architecture-check\.md:' \
    | grep -v '^\./scripts/' || true)
  [ -n "$hits" ] && report "$label"$'\n'"$hits"$'\n'
}

scan "$narration"   "Documentation narrates its own history. Move it to docs/agent-log.md or a decision record:"
scan "$positioning" "Documentation addresses a reader evaluating the author rather than one using the project:"
scan "$learning"    "Documentation frames itself as study material rather than an authored standard:"

# Matched on UTF-8 bytes under LC_ALL=C, because BSD grep has no \x{} escapes.
BANNED=(-e '—' -e $'\xf0\x9f' -e $'\xe2\x9c' -e $'\xe2\x9d')

typography=$(LC_ALL=C grep -rn "${BANNED[@]}" --include='*.md' "${EXCLUDED[@]}" . \
  | grep -v '^\./info/' \
  | grep -v '^\./scripts/' || true)

# Named back in, as the conformity hook names it, because AGENTS.md holds it to the
# same agreement as everything under docs/ while git never lists it. Naming it here
# is the difference between a rule it is held to and a rule it is checked against.
described=info/workflow-explique.md
if [ -f "$described" ]; then
  in_described=$(LC_ALL=C grep -n "${BANNED[@]}" "$described" \
    | sed "s|^|$described:|" || true)
  [ -n "$in_described" ] && typography=$(printf '%s\n%s' "$typography" "$in_described")
fi
[ -n "$typography" ] && report "Em dash or emoji, which the style rule bans everywhere:"$'\n'"$typography"$'\n'

# Claims the documentation makes about itself.

lines=$(wc -l < AGENTS.md | tr -d ' ')
[ "$lines" -gt 150 ] && report "AGENTS.md is $lines lines, and docs/README.md states it stays under 150."

uncharted=$(markdown ./docs -maxdepth 1 | while IFS= read -r f; do
  base=${f#./docs/}
  [ "$base" = "README.md" ] && continue
  grep -q "($base)" docs/README.md || printf '  %s\n' "$f"
done)
[ -n "$uncharted" ] && report "The documentation map does not list these, and claims to list everything:"$'\n'"$uncharted"$'\n'

broken=$(markdown . | while IFS= read -r file; do
  dir=$(dirname "$file")
  grep -oE '\]\([^)]+\)' "$file" | sed 's/^](//;s/)$//' \
    | grep -vE '^(https?:|mailto:|#)' | while IFS= read -r target; do
    target=${target%%#*}
    [ -n "$target" ] && [ ! -e "$dir/$target" ] && printf '  %s -> %s\n' "$file" "$target"
  done
done)
[ -n "$broken" ] && report "Relative links that resolve to nothing:"$'\n'"$broken"$'\n'

# A claim with no link is a claim nobody checked.
unlinked=$(awk 'BEGIN{RS="";FS="\n"} /^\*\*/ && !/http/ && !/^\*\*What this is/ {print "  " $1}' docs/sources.md)
[ -n "$unlinked" ] && report "Entries in sources.md with no source:"$'\n'"$unlinked"$'\n'

# A version pin whose reason expires with nothing scheduled to notice.
untriggered=$(for f in $(markdown ./docs/decisions | grep '/0'); do
  grep -qiE '\bpinn?(ed|s)?\b' "$f" || continue
  grep -q '^revisit-when:' "$f" || printf '  %s\n' "$f"
done)
[ -n "$untriggered" ] && report "Decisions that pin something without a revisit trigger:"$'\n'"$untriggered"$'\n'

if [ "$fail" -eq 0 ]; then
  echo "docs: clean"
fi
exit "$fail"
