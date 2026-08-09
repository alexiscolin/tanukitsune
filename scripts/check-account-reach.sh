#!/bin/bash
# Proves refuse-account-reach.sh refuses what it claims to refuse, and that the configuration the
# refusal rests on is still there. A hook silent on every input is indistinguishable from one nothing
# registered, which is the failure it exists to catch.
#
# Exit 3 when it cannot judge at all, as check-review-coverage.sh does, and 1 for everything it judges
# and refuses, the registration included: a guard registered on the wrong event is a failure this can
# see, not a question it cannot answer.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

hook=$PWD/.claude/hooks/refuse-account-reach.sh
settings=$PWD/.claude/settings.json
fail=0

command -v jq >/dev/null 2>&1 || { printf 'jq is needed to read the hook registration.\n' >&2; exit 3; }
jq empty "$settings" 2>/dev/null || { printf '%s is not readable as JSON.\n' "$settings" >&2; exit 3; }

# The configuration first, because a decision is worth nothing on an event the hook is not registered
# for, and because the deny list is one of the three paths docs/verification.md claims are held. The
# registration is keyed on the hook's own file rather than on a matcher string, another Bash hook
# arriving later being no proof about this one. It stops the run where the deny entry does not: every
# case below is moot on the wrong event, and none of them is moot on a missing permission.
matcher=$(jq -r '
  .hooks.PreToolUse[]
  | select([.hooks[].args[]] | any(endswith("refuse-account-reach.sh")))
  | .matcher' "$settings")
if [ "$matcher" != "Bash" ]; then
  printf 'probe "registration": the hook is registered on "%s" rather than on Bash\n' "$matcher" >&2
  exit 1
fi

jq -e '.permissions.deny | any(. == "WebFetch(domain:api.wanikani.com)")' "$settings" >/dev/null || {
  printf 'probe "deny": the API is no longer denied as a WebFetch destination\n' >&2
  fail=1
}

# Where the source answers is an argument, so the end-to-end suite can name a server of its own. What
# holds a deployment on the real host is that naming nothing reaches it, and that nothing committed
# names anything else: a default quietly moved, or a value in the file bootstrap copies, would point
# a machine holding a real token at whoever answered.
grep -qF "export const API = 'https://api.wanikani.com/v2'" src/data/wanikani/paging.ts || {
  printf 'probe "default": the source no longer falls back to the real API\n' >&2
  fail=1
}
grep -q '^[[:space:]]*WANIKANI_API=' .env.example && {
  printf 'probe "committed": .env.example points the source away from the real API\n' >&2
  fail=1
}

# A command is quoted text inside a JSON string, and the case naming a client that quotes its own
# argument carries both a quote and a backslash. The escaping is the one announce-shared-edit.sh
# writes, for its reason: malformed JSON is dropped without a word, which would pass a case the real
# event never sends.
payload() {
  local command=${1//\\/\\\\}
  command=${command//\"/\\\"}
  printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$command"
}

# `deny` when the decision must be printed, `silent` when nothing at all must be, which is how this
# hook lets a call through: an absent field decides nothing, where a stated one refuses.
judge() {
  local label=$1 want=$2 payload=$3
  local got

  got=$(bash "$hook" 2>/dev/null <<< "$payload")

  case $want in
    deny) [[ $got == *'"permissionDecision":"deny"'* ]] && return 0 ;;
    silent) [ -z "$got" ] && return 0 ;;
  esac

  printf 'probe "%s": expected %s, got %s\n' "$label" "$want" "${got:-nothing}" >&2
  fail=1
}

expect() {
  judge "$1" "$2" "$(payload "$3")"
}

expect 'the API by itself'       deny   'curl https://api.wanikani.com/v2/reviews'
expect 'the API mid-command'     deny   'TOKEN=x sh -c "curl -X POST https://api.wanikani.com/v2/reviews"'
expect 'the API without curl'    deny   'node -e "fetch(\"https://api.wanikani.com/v2/summary\")"'
expect 'the API without scheme'  deny   'curl api.wanikani.com/v2/summary'
expect 'the API in upper case'   deny   'curl https://API.WaniKani.com/v2/reviews'
expect 'a local route'           silent 'curl http://localhost:3000/api/health'
expect 'the documentation host'  silent 'git commit -m "docs: cite https://docs.api.wanikani.com/20170710/"'
expect 'the name in a search'    silent 'grep -rn wanikani src/'
expect 'the host named in prose' silent 'git commit -m "docs: say what api.wanikani.com is"'

# One payload past its first line, built by hand because `payload` emits a single line and that is the
# property under test: the hook reads to end of input rather than to end of line, and a read stopping
# at the first line would pass all nine cases above while letting an indented payload through.
judge 'the API past the first line' deny "$(cat <<'PAYLOAD'
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl https://api.wanikani.com/v2/reviews"
  }
}
PAYLOAD
)"

[ "$fail" -eq 0 ] && echo "account reach: proven"
exit "$fail"
