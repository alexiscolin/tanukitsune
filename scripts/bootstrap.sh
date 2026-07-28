#!/bin/bash
# One command from a fresh clone to a running application. Idempotent throughout,
# so running it again is the normal way to pick up a dependency change.

set -euo pipefail
cd "$(dirname "$0")/.."

required=22
current=$(node -p 'process.versions.node.split(".")[0]')
if [ "$current" -lt "$required" ]; then
  printf 'Node %s or later is required, found %s.\n' "$required" "$(node -v)" >&2
  exit 1
fi

pnpm install --frozen-lockfile

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  printf 'Created .env.local from .env.example.\n'
fi

pnpm db:migrate

printf 'Ready. Run pnpm dev.\n'
