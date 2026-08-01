#!/bin/bash
# Refuses what a design session left in its iteration area, and proves the hook that keeps
# that area quiet still does. Alternatives are written under src/ui/sketches/ and compared
# in the catalogue, and .claude/skills/design empties the directory once one wins. Nothing
# else catches a leftover: a component carrying a story satisfies both dependency-cruiser
# and knip, which is exactly what makes sketching legal while the session runs. So the
# refusal belongs at the merge, and the announcing hook stays free to never block.
#
# Writes two probes into the area, expects the search to find them and the hook to stay
# silent about them, removes them. A probe surviving a killed run is an orphan module
# dependency-cruiser refuses, and the Stop hook runs gate, so it would refuse every turn
# until someone found it; the trap prevents that.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

area=src/ui/sketches
probe=$area/gate-probe.tsx
importer=$area/gate-probe-importer.tsx
hook=.claude/hooks/announce-shared-edit.sh

fail=0

# Sources only. find reads no .gitignore, so a .DS_Store the Finder drops in the area would
# otherwise refuse the merge, naming a file no session wrote and none can promote.
sketches() { find "$area" -type f -name '*.ts*' 2>/dev/null | sort; }

# The hook is run rather than read, the way check-tokens.sh runs ESLint and
# check-boundaries.sh runs depcruise. Grepping it for the path it matches would prove the
# line exists and not that it wins: a case takes its first matching arm, so the same arm
# moved below the general one leaves any search green while the hook starts announcing
# every edit inside the area, which is the noise the area exists to remove.
announce() { announce_absolute "$PWD/$1"; }
announce_absolute() {
  CLAUDE_PROJECT_DIR=$PWD bash "$hook" <<< "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$1\"}}"
}

# The gate and the hook are executable and are run above. The skill is prose and cannot be,
# so the one thing left to assert is that it still sends a session to the directory this
# gate empties: renamed there alone, work would be written where nothing looks for it.
if ! grep -qF "$area" .claude/skills/design/SKILL.md; then
  printf '.claude/skills/design/SKILL.md does not name %s, so a session would write where this gate never looks.\n' "$area" >&2
  fail=1
fi

# The probes live inside the directory the gate empties, so they cannot be named out of
# their own way the boundary and token probes are. They therefore never write over
# anything: truncating a session's work and then deleting it would destroy it while
# reporting a clean tree, and a concurrent run would clobber the other's proof. Checked
# before the trap is armed, or the exit would delete the very files it declined to
# overwrite.
for path in "$probe" "$importer"; do
  if [ -e "$path" ]; then
    printf '%s already exists, so this gate will not write its probe over it. Move or delete it first.\n' "$path" >&2
    exit 1
  fi
done

cleanup() { rm -f "$probe" "$importer"; rmdir "$area" 2>/dev/null; }
trap cleanup EXIT

# One probe importing the other, because a file nothing imports is silent under any arm and
# would prove nothing about which one answered.
mkdir -p "$area"
printf 'export const PROBE = 1\n' > "$probe"
printf "import { PROBE } from './gate-probe'\nexport const USES = PROBE\n" > "$importer"

found=$(sketches)
silence=$(announce "$probe")
speech=$(announce src/app/globals.css)
# The two above hand the hook the one spelling its prefix strip removes cleanly, so they
# cannot see it fall silent on a path that reached it another way. This one does not
# match the project directory byte for byte and must still be named.
detoured=$(announce ./src/app/globals.css)
# A path in another checkout entirely, which shares this tree's shape and must not be
# reported as this tree's component.
foreign=$(announce_absolute /tmp/not-this-tree/src/app/globals.css)
cleanup

case "$found" in
  *"$probe"*) ;;
  *)
    printf 'The search did not find %s while it existed, so a clean report here would prove nothing.\n' "$probe" >&2
    fail=1
    ;;
esac

if [ -n "$silence" ]; then
  printf 'The announcing hook spoke about %s, which is inside the area it must ignore:\n%s\n' "$probe" "$silence" >&2
  fail=1
fi

if [ -z "$speech" ]; then
  printf 'The announcing hook said nothing about src/app/globals.css, so its silence above proves nothing.\n' >&2
  fail=1
fi

if [ -n "$foreign" ]; then
  printf 'The announcing hook spoke about a path in another checkout, so it names components that are not this tree:\n%s\n' "$foreign" >&2
  fail=1
fi

if [ -z "$detoured" ]; then
  printf 'The announcing hook said nothing about a path that did not match the project directory exactly, so it is silent wherever the two spellings differ.\n' >&2
  fail=1
fi

left=$(sketches)
if [ -n "$left" ]; then
  printf 'A design session left work in %s. It exists to be compared and never to merge, so promote one and empty it:\n%s\n' "$area" "$left" >&2
  fail=1
fi

[ "$fail" -eq 0 ] && printf 'sketches: proven, none left\n'
exit "$fail"
