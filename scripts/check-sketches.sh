#!/bin/bash
set -euo pipefail

# A design session writes sketch-*.tsx to compare alternatives, and .claude/skills/design
# deletes them once one wins. Nothing else catches one left behind: a component carrying a
# story satisfies both dependency-cruiser and knip, which is exactly what makes sketching
# legal while the session runs. So the refusal belongs at the merge rather than at the
# edit, and the announcing hook stays free to never block.

cd "$(dirname "$0")/.."

PROBE=src/ui/sketch-gate-probe.tsx

# A probe surviving a killed run is a file typecheck, lint and arch all refuse, and the
# Stop hook runs gate, so it would refuse every turn until someone found it. The trap is
# what prevents that.
cleanup() { rm -f "$PROBE"; }
trap cleanup EXIT

sketches() { find src -type f -name 'sketch-*' | sort; }

# Prove the search finds one before trusting it to report none. A find whose pattern or
# whose root stopped matching reports a clean tree in the same words as a clean tree does.
: > "$PROBE"
found=$(sketches)
cleanup

case "$found" in
  *"$PROBE"*) ;;
  *)
    printf 'The search did not find %s while it existed, so a clean report here would prove nothing.\n' "$PROBE" >&2
    exit 1
    ;;
esac

left=$(sketches)
if [ -n "$left" ]; then
  printf 'A design session left sketches behind. They exist to be compared and never to merge, so delete them or promote one:\n%s\n' "$left" >&2
  exit 1
fi

printf 'sketches: proven, none left\n'
