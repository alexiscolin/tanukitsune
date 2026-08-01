#!/bin/bash
# Refuses what a design session left in its iteration area. Alternatives are written under
# src/ui/sketches/ and compared in the catalogue, and .claude/skills/design empties the
# directory once one wins. Nothing else catches a leftover: a component carrying a story
# satisfies both dependency-cruiser and knip, which is exactly what makes sketching legal
# while the session runs. So the refusal belongs at the merge, and the announcing hook
# stays free to never block.
#
# Writes one probe into the area, expects the search to find it, removes it. A probe
# surviving a killed run is an orphan module dependency-cruiser refuses, and the Stop hook
# runs gate, so it would refuse every turn until someone found it; the trap prevents that.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

area=src/ui/sketches
probe=$area/gate-probe.tsx

fail=0

# Sources only. find reads no .gitignore, so a .DS_Store the Finder drops in the area would
# otherwise refuse the merge, naming a file no session wrote and none can promote.
sketches() { find "$area" -type f -name '*.ts*' 2>/dev/null | sort; }

# The probe lives inside the directory the gate empties, so it cannot be named out of its
# own way the boundary and token probes are. It therefore never writes over anything:
# truncating a session's work and then deleting it would destroy it while reporting a clean
# tree, and a concurrent run would clobber the other's proof. Checked before the trap is
# armed, or the exit would delete the very file it declined to overwrite.
if [ -e "$probe" ]; then
  printf '%s already exists, so this gate will not write its probe over it. Move or delete it first.\n' "$probe" >&2
  exit 1
fi

cleanup() { rm -f "$probe"; rmdir "$area" 2>/dev/null; }
trap cleanup EXIT

# The probe below writes inside the directory it then searches, so the two cannot disagree
# and finding it proves nothing about the path being the right one. What makes the path
# right is that the other two mechanisms keying on it agree, which is asserted here the way
# check-tokens.sh asserts the message its own probe depends on: the skill that fills the
# area and the hook that stays silent inside it. An area renamed in one place and not the
# others leaves this gate searching where nobody writes, and reporting a clean tree for it.
# The hook is matched on the case arm rather than the bare path, since the path appears in
# its header comment too and a comment left behind would satisfy a plain search while the
# arm that decides had moved.
naming() {
  grep -qF "$2" "$1" && return 0
  printf '%s does not carry %s, so this gate would search where nothing is written.\n' "$1" "$2" >&2
  fail=1
}
naming .claude/skills/design/SKILL.md "$area"
naming .claude/hooks/announce-shared-edit.sh "$area/*)"

# Prove the search reaches the area at all before trusting it to report an empty one.
mkdir -p "$area"
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
  printf 'A design session left work in %s. It exists to be compared and never to merge, so promote one and empty it:\n%s\n' "$area" "$left" >&2
  fail=1
fi

[ "$fail" -eq 0 ] && printf 'sketches: proven, none left\n'
exit "$fail"
