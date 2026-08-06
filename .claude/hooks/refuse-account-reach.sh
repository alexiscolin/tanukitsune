#!/bin/bash
# Refuses a shell command naming the WaniKani API. The reader's account is production data:
# a submission moves a real SRS stage, cannot be taken back, and WaniKani offers no sandbox,
# so the one destination is closed rather than the tools that could reach it.
#
# A deny entry cannot express this. A permission pattern matches a prefix, so refusing curl
# would refuse a call to a local route as readily as one to the API, and the local route is
# what the flush is verified against.
#
# Registered for the session rather than written in a prompt, because a prompt reaches only
# the agent that reads it while a registration fires for every subagent the session spawns.
#
# What it does not hold, both stated in docs/verification.md rather than defended here: the
# application's own fetch, which is not a tool call and is held by the empty token verify
# builds with, and a command reaching the same host without naming it.

input=$(cat)

# Read without jq, as the two hooks beside it do and for their reason: a hook PATH thin
# enough to lose pnpm loses a packaged jq with it. Spacing is tolerated rather than assumed,
# the way announce-shared-edit.sh matches its own field.
grep -qE '"tool_name"[[:space:]]*:[[:space:]]*"Bash"' <<< "$input" || exit 0

# The host as a destination, not as a word. A command carries the whole of what it writes, a
# commit message and a document among them, so a bare name would refuse writing about the rule
# as readily as breaking it. What a call cannot avoid is a scheme before the host or a path
# after it. The host is required to start the name rather than end it, since the documentation
# lives one label to the left and this repository's own documents link it. Case-insensitive,
# a host resolving the same whatever the case.
grep -qiE '://api\.wanikani\.com|(^|[^.[:alnum:]-])api\.wanikani\.com/' <<< "$input" || exit 0

# deny is stated rather than exit 2, because the reason then reaches the agent as a decision
# on the call instead of as an error the agent may read as a failure worth retrying.
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' \
  "api.wanikani.com is refused to a tool call. The account is production data and a submission cannot be taken back. The application reaches the API through its own fetch, and a call made by hand is the reader's to make."
