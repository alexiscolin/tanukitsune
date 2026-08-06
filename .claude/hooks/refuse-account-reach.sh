#!/bin/bash
# Refuses a Bash command carrying the WaniKani API as its destination. The account it reaches
# holds real progress and a submission cannot be taken back. Reasoning, and the paths this does
# not hold, in verification.md#the-permission-layer.
#
# The host must start its own name and be met by a scheme or a path: the documentation lives one
# label to the left, and a command carries everything it writes, a commit message included, so a
# bare name would refuse writing about the rule as readily as breaking it.

input=$(cat)

# The literal decides first and as a builtin, since nothing reaches the host without carrying it:
# a command that never names it leaves here having paid for one comparison and no process. Case is
# folded for every match below, a host resolving the same whatever the case. Read without jq, as
# the two hooks beside it do and for their reason: a hook PATH thin enough to lose pnpm loses a
# packaged jq with it.
shopt -s nocasematch
case "$input" in *api.wanikani.com*) ;; *) exit 0 ;; esac

destination='://api\.wanikani\.com|(^|[^.[:alnum:]-])api\.wanikani\.com/'
[[ $input =~ $destination ]] || exit 0

# Last, the tool: settings.json selects this hook on Bash alone, so the answer is fixed for every
# real call and asking it first would spend the scan on every command that names nothing.
tool='"tool_name"[[:space:]]*:[[:space:]]*"Bash"'
[[ $input =~ $tool ]] || exit 0

# deny is stated rather than exit 2, because the reason then reaches the agent as a decision on the
# call instead of as an error the agent may read as a failure worth retrying.
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' \
  "api.wanikani.com is refused to a tool call. The account holds real progress and a submission cannot be taken back. The application reaches the API through its own fetch, and a call made by hand is the reader's to make."
