#!/bin/bash
# Proves the boundary rules fire, rather than trusting that they do. Both of them
# matched nothing once: `^server-only$` cannot match a path that resolves inside
# node_modules, and an adjacency-only rule misses ui -> app -> data.
#
# Writes two probes into src/ui/, expects a violation for each, removes them.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

probe_dir=src/ui
# A probe has to live under src/ui/, because that path is what the rules match on.
# So tsconfig excludes it instead: a typecheck enumerating src/ while a probe exists
# reports a file the removal below has taken away, as TS6053. The gate runs from a
# hook at the end of every turn, so a typecheck running beside this script is the
# ordinary case and not an unlucky one.
probe_prefix=__boundary-probe-
server_only=$probe_dir/${probe_prefix}server-only.ts
reaches_data=$probe_dir/${probe_prefix}reaches-data.ts

cleanup() { rm -f "$server_only" "$reaches_data"; }
trap cleanup EXIT

mkdir -p "$probe_dir"
fail=0

# Both exclusions are asserted, not trusted: renaming a probe leaves the patterns
# matching nothing, and each brings back a different failure. Without the tsconfig
# one, a typecheck enumerating src/ reports a file this script has since removed.
# Without the eslint one, `projectService` refuses to parse a file the project no
# longer contains, for as long as a probe exists. Matched as the literal string
# both files carry, so the gate gains no dependency for one assertion.
excluded="src/**/${probe_prefix}*.ts"
if ! grep -qF "\"$excluded\"" tsconfig.json; then
  printf 'tsconfig.json does not exclude %s, so a typecheck can fail on a probe.\n' "$excluded" >&2
  fail=1
fi
if ! grep -qF "'$excluded'" eslint.config.js; then
  printf 'eslint.config.js does not ignore %s, so a lint can fail on a probe.\n' "$excluded" >&2
  fail=1
fi

printf "import 'server-only'\n\nexport const PROBE = 1\n" > "$server_only"
if ./node_modules/.bin/depcruise src > /dev/null 2>&1; then
  printf 'A ui/ module importing server-only did not violate any rule.\n' >&2
  fail=1
fi
rm -f "$server_only"

printf "import { env } from '@/data/env'\n\nexport const PROBE = env.DATABASE_URL\n" > "$reaches_data"
if ./node_modules/.bin/depcruise src > /dev/null 2>&1; then
  printf 'A ui/ module reaching data/ did not violate any rule.\n' >&2
  fail=1
fi
rm -f "$reaches_data"

[ "$fail" -eq 0 ] && echo "boundaries: proven"
exit "$fail"
