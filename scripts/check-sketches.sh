#!/bin/bash
# Refuses a sketch a design session left behind. Sketches are named sketch-* and compare
# alternatives in the catalogue, and .claude/skills/design deletes them once one wins.
# Nothing else catches one: a component carrying a story satisfies both dependency-cruiser
# and knip, which is exactly what makes sketching legal while the session runs. So the
# refusal belongs at the merge, and the announcing hook stays free to never block.
#
# Writes one probe into src/ui/, expects the search to find it, removes it. A probe
# surviving a killed run is an orphan module dependency-cruiser refuses, and the Stop hook
# runs gate, so it would refuse every turn until someone found it; the trap prevents that.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

probe_dir=src/ui
probe=$probe_dir/sketch-gate-probe.tsx

cleanup() { rm -f "$probe"; }
trap cleanup EXIT

fail=0

sketches() { find src -type f -name 'sketch-*' | sort; }

# Prove the search finds one before trusting it to report none. A find whose pattern or
# whose root stopped matching reports a clean tree in the same words as a clean tree does.
: > "$probe"
found=$(sketches)
cleanup

case "$found" in
  *"$probe"*) ;;
  *)
    printf 'The search did not find %s while it existed, so a clean report here would prove nothing.\n' "$probe" >&2
    fail=1
    ;;
esac

left=$(sketches)
if [ -n "$left" ]; then
  printf 'A design session left sketches behind. They exist to be compared and never to merge, so delete them or promote one:\n%s\n' "$left" >&2
  fail=1
fi

[ "$fail" -eq 0 ] && printf 'sketches: proven, none left\n'
exit "$fail"
