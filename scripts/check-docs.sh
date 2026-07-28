#!/bin/bash
# Fails when documentation narrates its own history, addresses a reader who is
# evaluating the author, or reads as study material. Deterministic, so the rule
# does not depend on anyone remembering it.
#
# Scope: markdown outside .git, plus commit messages on this branch.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0
report() { printf '%s\n' "$1" >&2; fail=1; }

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
  hits=$(grep -rniE "$pattern" --include='*.md' . \
    | grep -v '^\./\.git/' \
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

if [ "$fail" -eq 0 ]; then
  echo "docs: clean"
fi
exit "$fail"
