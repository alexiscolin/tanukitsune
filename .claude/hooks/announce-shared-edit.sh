#!/bin/bash
# Names an edit that leaves the sketch, and never refuses one. A design session is
# additive while it writes sketch-*.tsx, and shared the moment it reaches the token source
# or a component something else already renders, which is where .claude/skills/design
# requires an announcement the reader cannot miss. A rule in prose depends on the agent
# remembering it; this fires either way.
#
# PreToolUse stdout is not shown to the agent, so the notice travels in
# hookSpecificOutput.additionalContext, which is injected beside the tool result without
# blocking. permissionDecision is defer rather than allow: this hook informs, it never
# grants a permission the reader would otherwise be asked for.

input=$(cat)

# Read without jq, as .claude/hooks/verify.sh does and for its reason: a hook PATH thin
# enough to lose pnpm loses a packaged jq with it.
case "$input" in
  *'"tool_name":"Edit"'* | *'"tool_name": "Edit"'* | *'"tool_name":"Write"'* | *'"tool_name": "Write"'*) ;;
  *) exit 0 ;;
esac

path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$path" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
rel=${path#"$PWD"/}

notice=''
case "$rel" in
  src/app/globals.css)
    notice='globals.css is the single token source. Every route and every story renders through it, so a value changed here changes what already works and not only the sketch. Name what else it reaches before editing.'
    ;;
  src/ui/*.tsx | src/ui/*/*.tsx)
    base=$(basename "$rel" .tsx)
    case "$base" in
      sketch-* | *.test | *.stories) exit 0 ;;
    esac
    # An import resolves through @/ui/..., through a relative path, or from the catalogue
    # configuration, and all three end on the file name, so one pattern covers them. Its
    # own story and test are excluded: they are what make a sketch legal, not what makes a
    # component shared.
    importers=$(grep -rlE "/${base}['\"]" src .storybook --include='*.ts' --include='*.tsx' 2>/dev/null |
      grep -vE "(^|/)${base}\.(test|stories)\.tsx$" | tr '\n' ' ' | sed 's/ *$//')
    [ -n "$importers" ] && notice="${rel} is already rendered by: ${importers}. This edit is not isolated, so say what changes for them before making it."
    ;;
esac

[ -n "$notice" ] || exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"defer","additionalContext":"%s"}}\n' "$notice"
