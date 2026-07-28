#!/bin/bash
# Proves the boundary rules fire, rather than trusting that they do. Both of them
# matched nothing once: `^server-only$` cannot match a path that resolves inside
# node_modules, and an adjacency-only rule misses ui -> app -> data.
#
# Writes two probes into src/ui/, expects a violation for each, removes them.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

probe_dir=src/ui
server_only=$probe_dir/__boundary-probe-server-only.ts
reaches_data=$probe_dir/__boundary-probe-reaches-data.ts

cleanup() { rm -f "$server_only" "$reaches_data"; }
trap cleanup EXIT

mkdir -p "$probe_dir"
fail=0

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
