#!/bin/bash
# Proves refuse-account-reach.sh refuses what it claims to refuse, rather than trusting that it
# does. A hook silent on every input is indistinguishable from one nothing registered, which is the
# failure it exists to catch.
#
# Feeds the hook one PreToolUse payload per case and reads the decision it prints.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

hook=$PWD/.claude/hooks/refuse-account-reach.sh
settings=$PWD/.claude/settings.json
fail=0

command -v jq >/dev/null 2>&1 || { printf 'jq is needed to read the hook registration.\n' >&2; exit 1; }

# First, because a decision is worth nothing on an event the hook is not registered for: a matcher
# widened or renamed leaves every case below passing while the guard is off. Keyed on the file
# rather than on the matcher string, another Bash hook arriving later being no proof about this one.
matcher=$(jq -r '
  .hooks.PreToolUse[]
  | select([.hooks[].args[]] | any(endswith("refuse-account-reach.sh")))
  | .matcher' "$settings")
if [ "$matcher" != "Bash" ]; then
  printf 'probe "registration": the hook is registered on "%s" rather than on Bash\n' "$matcher" >&2
  exit 1
fi

# A command is quoted text inside a JSON string, and two cases below carry quotes of their own. The
# escaping is the one announce-shared-edit.sh writes, for its reason: malformed JSON is dropped
# without a word, which would pass a case the real event never sends.
payload() {
  local command=${2//\\/\\\\}
  command=${command//\"/\\\"}
  printf '{"tool_name":"%s","tool_input":{"command":"%s"}}' "$1" "$command"
}

# `deny` when the decision must be printed, `silent` when nothing at all must be, which is how this
# hook lets a call through: an absent field decides nothing, where a stated one refuses.
expect() {
  local label=$1 want=$2 tool=$3 command=$4
  local got

  got=$(bash "$hook" 2>/dev/null <<< "$(payload "$tool" "$command")")

  case $want in
    deny) case $got in *'"permissionDecision":"deny"'*) return 0 ;; esac ;;
    silent) [ -z "$got" ] && return 0 ;;
  esac

  printf 'probe "%s": expected %s, got %s\n' "$label" "$want" "${got:-nothing}" >&2
  fail=1
}

expect 'the API by itself'       deny   Bash 'curl https://api.wanikani.com/v2/reviews'
expect 'the API mid-command'     deny   Bash 'TOKEN=x sh -c "curl -X POST https://api.wanikani.com/v2/reviews"'
expect 'the API without curl'    deny   Bash 'node -e "fetch(\"https://api.wanikani.com/v2/summary\")"'
expect 'the API without scheme'  deny   Bash 'curl api.wanikani.com/v2/summary'
expect 'the API in upper case'   deny   Bash 'curl https://API.WaniKani.com/v2/reviews'
expect 'a local route'           silent Bash 'curl http://localhost:3000/api/health'
expect 'the documentation host'  silent Bash 'git commit -m "docs: cite https://docs.api.wanikani.com/20170710/"'
expect 'the name in a search'    silent Bash 'grep -rn wanikani src/'
expect 'the host named in prose' silent Bash 'git commit -m "docs: say what api.wanikani.com is"'
expect 'another tool'            silent Read 'https://api.wanikani.com/v2/reviews'

[ "$fail" -eq 0 ] && echo "account reach: proven"
exit "$fail"
