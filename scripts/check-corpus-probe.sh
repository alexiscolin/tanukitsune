#!/bin/bash
# Runs scripts/check-corpus.ts over the committed material, then over a probe locale written to
# refuse: a key in another script, a key two characters answer to, a name with no article, and a word
# stated twice in an order. Expects the first to pass and every probe to be named.
#
# The probe locale is written under a temporary root rather than into corpus/, so a run killed halfway
# leaves nothing behind for the next gate to read as material.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

check() { node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/check-corpus.ts "$@"; }

fail=0
report() { printf '%s\n' "$1" >&2; fail=1; }

if ! committed=$(check 2>&1); then
  report 'the committed corpus does not pass its own check'
  printf '%s\n' "$committed" >&2
fi

root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/xx"

cat >"$root/xx/naming.json" <<'JSON'
{
  "language": "Probe",
  "opensWith": ["le "],
  "letters": "abcdefghijklmnopqrstuvwxyz",
  "joiners": "' -",
  "mostWords": 2,
  "examples": []
}
JSON
cat >"$root/xx/keys.json" <<'JSON'
{ "keys": { "A": "dragon 龍", "B": "chien", "C": "Chien" } }
JSON
cat >"$root/xx/components.json" <<'JSON'
{ "names": { "D": "bouche", "E": "le puits", "F": "le puits" } }
JSON
cat >"$root/xx/key-choice.json" <<'JSON'
{ "order": { "G": ["mot", "mot"], "H": [] } }
JSON
# One word standing for two readings, and two anchors a reader hears as one: the whole-set rules the
# allocation holds while it runs, which nothing held the committed file to until this read it.
cat >"$root/xx/phonology.json" <<'JSON'
{
  "cannotStart": [], "nearest": 0.5, "apart": 0.2, "sameSound": 0.25, "unrated": 50,
  "atMostMorae": 4, "atLeastCommon": 1, "partsOfSpeech": ["NOM"], "atMostWords": 3,
  "hears": {}, "writes": {}, "refuses": []
}
JSON
cat >"$root/xx/anchors.json" <<'JSON'
{
  "anchors": {
    "\u3053": ["le coq", ["k", "o", "k"], 8],
    "\u3053\u3046": ["le coq", ["k", "o", "k"], 8],
    "\u3055": ["la scie", ["s", "i"], 9],
    "\u3057": ["le site", ["s", "i", "t"], 9]
  },
  "left": {}
}
JSON

refused=$(check "$root" 2>&1)
if [ -z "$refused" ]; then
  report 'the check accepted a locale written to be refused'
fi

for expected in 'not the locale' 'both keyed' 'no article' 'names more than one component' 'states a word twice' 'holds nothing for' 'stands for more than one reading' 'sit nearer than'; do
  case "$refused" in
    *"$expected"*) ;;
    *) report "the check did not name: $expected" ;;
  esac
done

if [ "$fail" -eq 0 ]; then
  printf 'corpus: checked, and refuses what it claims to\n'
fi

exit "$fail"
