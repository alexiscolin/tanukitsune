#!/bin/bash
# The second database the end-to-end suite needs, migrated before a route reads it. It exists at all
# because the file-backed driver is one process over one directory and the suite runs two servers.
#
# It is a script rather than a line in the package script because the decision cannot be made from a
# shell: drizzle-kit loads .env.local itself, so a DATABASE_URL named there is invisible to the
# caller. Named there, both servers share one server Postgres, which takes two clients without
# complaint, and migrating a second directory would instead apply migrations to that deployment.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Read the way drizzle.config.ts reads it, from the file it reads, so the two cannot disagree about
# which database this run is against.
named=$(node -e "try{process.loadEnvFile('.env.local')}catch{};process.stdout.write(process.env.DATABASE_URL??'')")

if [ -n "$named" ]; then
  echo "e2e database: a server one is named, so both servers share it"
  exit 0
fi

TANUKITSUNE_LOCAL_DATABASE=.postgres-account pnpm db:migrate
