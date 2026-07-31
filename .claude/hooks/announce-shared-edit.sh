#!/bin/bash
# Names an edit that leaves the sketch, and never refuses one. A design session is
# additive while it writes sketch-*.tsx, and shared the moment it reaches the token source
# or a component something else already renders, which is where .claude/skills/design
# requires an announcement the reader cannot miss. A rule in prose depends on the agent
# remembering it; this fires either way.
#
# PreToolUse stdout is not shown to the agent, so the notice travels in
# hookSpecificOutput.additionalContext, which is injected beside the tool result without
# blocking. permissionDecision is omitted rather than set: deciding nothing is what the
# absent field means, and allow would grant a permission the reader would be asked for.

input=$(cat)

# Read without jq, as .claude/hooks/verify.sh does and for its reason: a hook PATH thin
# enough to lose pnpm loses a packaged jq with it. The tool set is matched the way that
# file matches its own field, tolerating any spacing, rather than by listing every literal
# form. settings.json selects the same two tools, and a matcher widened there without this
# being widened too would leave the hook silent.
grep -qE '"tool_name"[[:space:]]*:[[:space:]]*"(Edit|Write)"' <<< "$input" || exit 0

# Only two path shapes ever produce a notice, and a matching file_path is by definition a
# substring of the input, so every other edit leaves here without paying for the read.
case "$input" in
  *src/ui/* | *globals.css*) ;;
  *) exit 0 ;;
esac

path=$(sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' <<< "$input")
[ -n "$path" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
rel=${path#"$PWD"/}

notice=''
case "$rel" in
  src/app/globals.css)
    notice='globals.css is the single token source. Every route and every story renders through it, so a value changed here changes what already works and not only the sketch. Name what else it reaches before editing.'
    ;;
  src/ui/*.tsx)
    dir=${rel%/*}
    base=${rel##*/}
    base=${base%.tsx}
    case "$base" in
      sketch-* | *.test | *.stories) exit 0 ;;
    esac
    # Keyed on the layer and the name together, never the name alone: the four layers make
    # one basename at two of them the normal case, and a component keyed by name would be
    # announced as already rendered on the day it is created. That covers @/ui/<layer>/<x>
    # and every relative form crossing a directory. A sibling importing ./<x> resolves
    # inside one directory, so it is searched in that directory alone and nowhere else.
    # The file's own story and test are excluded: they are what make a sketch legal, not
    # what makes a component shared.
    importers=$(
      {
        grep -rlE "${dir##*/}/${base}['\"]" src .storybook --include='*.ts' --include='*.tsx' 2>/dev/null
        grep -rlE "\./${base}['\"]" "$dir" --include='*.ts' --include='*.tsx' 2>/dev/null
      } | sort -u | grep -vE "(^|/)${base}\.(test|stories)\.tsx$"
    )
    importers=${importers//$'\n'/ }
    [ -n "$importers" ] && notice="${rel} is already rendered by: ${importers}. This edit is not isolated, so say what changes for them before making it."
    ;;
esac

[ -n "$notice" ] || exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$notice"
