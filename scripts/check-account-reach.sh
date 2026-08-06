#!/bin/bash
# Proves refuse-account-reach.sh refuses what it claims to refuse, and that the configuration the
# refusal rests on is still there. A hook silent on every input is indistinguishable from one nothing
# registered, which is the failure it exists to catch.
#
# Exit 3 rather than 1 when it cannot judge at all, as check-review-coverage.sh does: a run reporting
# the guard as proven when nothing was tested is the one answer worse than a refusal.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

hook=$PWD/.claude/hooks/refuse-account-reach.sh
settings=$PWD/.claude/settings.json
fail=0

command -v jq >/dev/null 2>&1 || { printf 'jq is needed to read the hook registration.\n' >&2; exit 3; }

# The configuration first, because a decision is worth nothing on an event the hook is not registered
# for, and because the deny list is one of the three paths docs/verification.md claims are held. The
# registration is keyed on the hook's own file rather than on a matcher string, another Bash hook
# arriving later being no proof about this one.
matcher=$(jq -r '
  .hooks.PreToolUse[]
  | select([.hooks[].args[]] | any(endswith("refuse-account-reach.sh")))
  | .matcher' "$settings")
if [ "$matcher" != "Bash" ]; then
  printf 'probe "registration": the hook is registered on "%s" rather than on Bash\n' "$matcher" >&2
  exit 3
fi

jq -e '.permissions.deny | any(. == "WebFetch(domain:api.wanikani.com)")' "$settings" >/dev/null || {
  printf 'probe "deny": the API is no longer denied as a WebFetch destination\n' >&2
  exit 3
}

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
  local label=$1 want=$2 command=$3
  local got

  got=$(bash "$hook" 2>/dev/null <<< "$(payload Bash "$command")")

  case $want in
    deny) [[ $got == *'"permissionDecision":"deny"'* ]] && return 0 ;;
    silent) [ -z "$got" ] && return 0 ;;
  esac

  printf 'probe "%s": expected %s, got %s\n' "$label" "$want" "${got:-nothing}" >&2
  fail=1
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

[ "$fail" -eq 0 ] && echo "account reach: proven"
exit "$fail"
