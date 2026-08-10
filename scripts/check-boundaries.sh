#!/bin/bash
# Proves the boundary rules fire, rather than trusting that they do. Both of them
# matched nothing once: `^server-only$` cannot match a path that resolves inside
# node_modules, and an adjacency-only rule misses ui -> app -> data.
#
# Writes probes into src/ui/ and src/app/, expects each named rule to refuse them,
# removes them.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# A probe has to live under the path the rules match on, so the exclusions below carry
# the prefix at any depth instead of a directory. The hop sits under src/app/ because
# that is the layer a real two-hop leak passes through.
probe_prefix=__boundary-probe-
server_only=src/ui/${probe_prefix}server-only.ts
reaches_data=src/ui/${probe_prefix}reaches-data.ts
data_hop=src/app/${probe_prefix}data-hop.ts
reaches_corpus=src/app/${probe_prefix}reaches-corpus.ts
reaches_ai=src/app/${probe_prefix}reaches-ai.ts
reaches_data_corpus=src/app/${probe_prefix}reaches-data-corpus.ts
ui_reaches_ai=src/ui/${probe_prefix}ui-reaches-ai.ts

cleanup() {
  rm -f "$server_only" "$reaches_data" "$data_hop" "$reaches_corpus" "$reaches_ai" "$reaches_data_corpus" "$ui_reaches_ai"
}
trap cleanup EXIT

mkdir -p src/ui src/app
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

# The same shape for the sibling cause. A worktree is a second checkout living inside
# the tree, and every checker that walks from the root reads it unless told otherwise.
# Those exclusions were written by hand in three syntaxes and nothing held them, so a
# refactor dropping one would bring the failure back in silence, visible only the next
# time a session works in a worktree while a gate runs.
worktrees=.claude/worktrees
for spec in "eslint.config.js:'$worktrees/**'" "scripts/check-docs.sh:'./$worktrees/*'" \
            "scripts/check-docs.sh:--exclude-dir=worktrees" ".gitignore:$worktrees/"; do
  file=${spec%%:*}
  pattern=${spec#*:}
  grep -qF -- "$pattern" "$file" && continue
  printf '%s does not exclude %s, so a checker reads another checkout.\n' "$file" "$pattern" >&2
  fail=1
done

# The exit code names no rule, and a probe trips more than one.
expect_rules() {
  local probe=$1 out rule
  shift
  # Colour is pinned off rather than stripped after the fact: an inherited FORCE_COLOR
  # puts a reset between the severity and the rule name, and NO_COLOR does not override
  # it. Matching on the severity is what tells an error from a warning.
  out=$(FORCE_COLOR=0 ./node_modules/.bin/depcruise src --output-type err 2>&1)
  for rule in "$@"; do
    grep -qF "error $rule:" <<< "$out" && continue
    printf '%s was not refused by %s.\n' "$probe" "$rule" >&2
    fail=1
  done
}

printf "import 'server-only'\n\nexport const PROBE = 1\n" > "$server_only"
expect_rules 'A ui/ module importing server-only' ui-imports-nothing-server-only
rm -f "$server_only"

# The hop imports server-only itself rather than inheriting it through data/env.ts, so
# the gate turns on the rules and not on what production code happens to import.
printf "import 'server-only'\nimport { env } from '@/data/env'\n\nexport const HOP = env.DATABASE_URL\n" > "$data_hop"
printf "import { HOP } from '@/app/${probe_prefix}data-hop'\n\nexport const PROBE = HOP\n" > "$reaches_data"
expect_rules 'A ui/ module reaching data/ through app/' ui-imports-no-io ui-imports-nothing-server-only
rm -f "$reaches_data" "$data_hop"

# The pipeline shares the toolchain with the product and nothing else, so the rule that
# keeps them apart is proven like the others rather than trusted.
printf "import { moraeOf } from '@/core/corpus/phonetics'\n\nexport const PROBE = moraeOf('か')\n" > "$reaches_corpus"
expect_rules 'An app/ module reaching the corpus pipeline' product-imports-no-corpus
rm -f "$reaches_corpus"

# The rule names three homes and a probe reaching one of them proves one of them, so each is reached
# in turn. Without the second, narrowing the target back to core/ and ai/ would pass this file.
printf "import { readComponentNames } from '@/data/corpus/artifact'\n\nexport const PROBE = readComponentNames\n" > "$reaches_data_corpus"
expect_rules 'An app/ module reaching the corpus readers' product-imports-no-corpus
rm -f "$reaches_data_corpus"

# The third home is the one holding a key and an SDK, so a target missing it would pass this file
# while shipping both to a browser.
printf "import { submitBatch } from '@/ai/corpus/batch'\n\nexport const PROBE = submitBatch\n" > "$reaches_ai"
expect_rules 'An app/ module reaching the model client' product-imports-no-corpus
rm -f "$reaches_ai"

# The io rule names src/(data|ai)/ and was proven for data/ alone, so narrowing it to src/data/ would
# have passed. This is the half it did not cover.
printf "import { submitBatch } from '@/ai/corpus/batch'\n\nexport const PROBE = submitBatch\n" > "$ui_reaches_ai"
expect_rules 'A ui/ module reaching the model client' ui-imports-no-io
rm -f "$ui_reaches_ai"

[ "$fail" -eq 0 ] && echo "boundaries: proven"
exit "$fail"
