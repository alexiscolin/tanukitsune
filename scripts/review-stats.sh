#!/bin/bash
# What the reviewers produce, and how much of it survives contact.
#
# A reviewer that reports nothing is indistinguishable from a reviewer that is
# broken, and neither the gates nor the reviewers themselves can tell the two
# apart. This is the same capture the product makes of judge overrides, for the
# same reason: the disagreement is the only signal about whether the grader works.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

log=.claude/review-log.jsonl

# Counted as a set of records rather than as lines. A merge can put one line in
# twice, by hand or through the union driver the log is merged with, and a lens
# whose findings are counted twice reads as busier than it was, which is the one
# number this exists to produce.
if [ ! -s "$log" ]; then
  echo "review-log: empty, so nothing can be said about the reviewers yet."
  exit 0
fi

jq -rs --arg _ "" '
  unique_by(tojson)
  | map(select((.kind // "finding") != "pass"))
  | group_by(.reviewer)
  | map({
      reviewer: .[0].reviewer,
      found: length,
      fixed: (map(select(.outcome == "fixed")) | length)
    })
  | sort_by(-.found)
  | .[]
  | "\(.reviewer | .[0:20])  found \(.found)  fixed \(.fixed)  kept \(if .found == 0 then 0 else (.fixed * 100 / .found | floor) end)%"
' "$log"

# Passes are the denominator. Findings alone cannot say whether a lens is quiet
# because the code is clean or because it ran once and never again.
printf '\n%s findings over %s passes, on %s branches\n' \
  "$(jq -rs "unique_by(tojson) | map(select((.kind // \"finding\") != \"pass\")) | length" "$log")" \
  "$(jq -rs "unique_by(tojson) | map(select(.kind == \"pass\")) | length" "$log")" \
  "$(jq -rs 'map(.branch) | unique | length' "$log")"

# What the lenses found is the easy half. What they let through is the half that
# says whether reading a diff with fresh eyes is worth what it costs, and the log
# already holds it: the file is append-only, so a finding recorded on a branch
# after a pass was on record there is a defect an earlier reading concluded
# without. Nothing else in this repository measures a reviewer against what it
# missed rather than against what it produced.
#
# It is an upper bound, not an escape count. A branch that keeps working after a
# pass earns findings about code that pass never saw, and separating the two
# needs the commit each finding sits in, which the log does not carry. The number
# is worth having anyway: a repository where it is near zero is one where the
# first reading was enough, and this one is not that.
printf '%s of them arrived on a branch that already had a pass on record\n' \
  "$(jq -rs '
    # unique_by sorts, and this measure is the one thing in the file that reads
    # append order, so duplicates are dropped without disturbing it.
    reduce .[] as $line ([]; if any(.[]; . == $line) then . else . + [$line] end)
    | map(.branch) as $branches
    | . as $lines
    | ($branches | unique)
    | map(
        . as $branch
        | [$lines[] | select(.branch == $branch)]
        | (to_entries | map(select(.value.kind == "pass")) | first) as $pass
        | if $pass == null then 0
          else [.[($pass.key + 1):][] | select((.kind // "finding") != "pass")] | length
          end
      )
    | add // 0
  ' "$log")"
