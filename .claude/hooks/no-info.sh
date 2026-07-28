#!/bin/bash
# Denies any access to info/, which AGENTS.md puts out of the project.
# Exit 2 refuses the call and returns stderr to the agent as the reason.
#
# Covers the shell as well as the file tools. A rule that only inspects
# file_path is bypassed by `cat info/notes.md`, which is not a narrower hole
# than the one it closes.

input=$(cat)

target=$(printf '%s' "$input" | jq -r '
  [.tool_input.file_path, .tool_input.path, .tool_input.pattern, .tool_input.command]
  | map(select(. != null)) | join(" ")
')

case " $target " in
  *info/*|*[\ /]info[\ /]*|*[\ /]info)
    printf 'info/ is human-only and is not part of the project. Do not read or write it.\n' >&2
    exit 2
    ;;
esac

exit 0
