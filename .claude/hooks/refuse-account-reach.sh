#!/bin/bash
# Refuses a Bash command carrying the WaniKani API as its destination. The account it reaches holds
# real progress and a submission cannot be taken back. Reasoning, and the paths this does not hold,
# in verification.md#the-permission-layer.

# Read as a builtin rather than through cat, alone among the three hooks here: this one runs before
# every shell command, where the fork the other two pay once a turn is the whole of the cost.
IFS= read -rd '' input

# Case is folded, a host resolving the same whatever the case. The tool is not tested: settings.json
# selects this hook on Bash, and a matcher widened later should refuse more rather than less, which
# a test here would turn into refusing less.
shopt -s nocasematch
destination='://api\.wanikani\.com|(^|[^.[:alnum:]-])api\.wanikani\.com/'
[[ $input =~ $destination ]] || exit 0

# deny is stated rather than exit 2, because the reason then reaches the agent as a decision on the
# call instead of as an error the agent may read as a failure worth retrying.
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' \
  "api.wanikani.com is refused to a tool call. The account holds real progress and a submission cannot be taken back. The application reaches the API through its own fetch, and a call made by hand is the reader's to make."
