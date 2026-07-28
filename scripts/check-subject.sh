#!/bin/bash
# One subject, one verdict. Used by both the pull request title job and the
# commit subject job, so the two cannot drift into different definitions of the
# same convention.
#
# Usage: check-subject.sh "docs: state the rule"

set -uo pipefail

subject="${1-}"

if [ -z "$subject" ]; then
  printf 'No subject given.\n' >&2
  exit 1
fi

if [ "${#subject}" -gt 72 ]; then
  printf 'Subject is %s characters, the limit is 72: %s\n' "${#subject}" "$subject" >&2
  exit 1
fi

types='feat|fix|docs|refactor|test|chore|perf|build|ci'
if ! printf '%s' "$subject" | grep -qE "^($types)(\([a-z0-9-]+\))?!?: [a-z]"; then
  printf 'Subject must read "type(scope): imperative starting lowercase": %s\n' "$subject" >&2
  exit 1
fi

exit 0
