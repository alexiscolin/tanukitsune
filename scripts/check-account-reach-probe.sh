#!/bin/bash
# Proves refuse-account-reach.sh refuses what it claims to refuse, rather than trusting that
# it does. A hook that stays silent on every input is indistinguishable from one that was
# never registered, which is the failure it exists to catch.
#
# Feeds the hook one PreToolUse payload per case and reads the decision it prints.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

hook=$PWD/.claude/hooks/refuse-account-reach.sh
fail=0

payload() {
  printf '{"tool_name":"%s","tool_input":{"command":"%s"}}' "$1" "$2"
}

# `deny` when the decision must be printed, `silent` when nothing at all must be, which is
# how this hook lets a call through: an empty decision is what the absent field means.
expect() {
  local label=$1 want=$2 tool=$3 command=$4
  local got

  got=$(payload "$tool" "$command" | bash "$hook" 2>/dev/null)

  case $want in
    deny) grep -q '"permissionDecision":"deny"' <<< "$got" && return 0 ;;
    silent) [ -z "$got" ] && return 0 ;;
  esac

  printf 'probe "%s": expected %s, got %s\n' "$label" "$want" "${got:-nothing}" >&2
  fail=1
}

expect 'the API by itself'      deny   Bash 'curl https://api.wanikani.com/v2/reviews'
expect 'the API mid-command'    deny   Bash 'TOKEN=x sh -c "curl -X POST https://api.wanikani.com/v2/reviews -d @body.json"'
expect 'the API without curl'   deny   Bash 'node -e "fetch(\"https://api.wanikani.com/v2/summary\")"'
expect 'the API without scheme' deny   Bash 'curl api.wanikani.com/v2/summary'
expect 'the API in upper case'  deny   Bash 'curl https://API.WaniKani.com/v2/reviews'
expect 'a local route'          silent Bash 'curl http://localhost:3000/api/health'
expect 'the documentation host' silent Bash 'git commit -m "docs: cite https://docs.api.wanikani.com/20170710/"'
expect 'the name in a search'   silent Bash 'grep -rn wanikani src/'
expect 'the host named in prose' silent Bash 'git commit -m "docs: say what api.wanikani.com is"'
expect 'another tool'           silent Read 'https://api.wanikani.com/v2/reviews'

# The decision is worth nothing on an event the hook is not registered for, and a matcher
# widened or renamed in settings.json leaves every case above passing while the guard is off.
grep -q '"matcher": "Bash"' .claude/settings.json || {
  printf 'probe "registration": .claude/settings.json registers no Bash matcher\n' >&2
  fail=1
}

[ "$fail" = 0 ] || exit 1
echo "account reach: the hook refuses the API and stays silent elsewhere"
