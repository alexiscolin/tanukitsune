#!/bin/bash
# Runs scripts/check-corpus.ts over the committed material, then over a probe locale written to
# refuse: a key in another script, a key two characters answer to, a name with no article, a word
# stated twice in an order, and a claimed set that has not been rebuilt since the words moved. Expects
# the first to pass and every probe to be named.
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
  "inflects": ["s"],
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
  "hears": {}, "writes": {}, "refuses": ["boche"]
}
JSON
mkdir -p "$root/yy"
# Every answer file and no guard, which a page importing the guard cannot build from.
printf '%s\n' '{ "names": { "D": "le puits" } }' >"$root/yy/components.json"
printf '%s\n' '{ "keys": { "A": "puits" } }' >"$root/yy/keys.json"
printf '%s\n' '{ "header": {}, "meanings": { "A": ["puits"] } }' >"$root/yy/meanings.json"
printf '%s\n' '{ "header": {}, "meanings": { "B": ["le puits"] } }' >"$root/yy/vocabulary.json"
cat >"$root/yy/naming.json" <<'JSON'
{
  "language": "Probe",
  "opensWith": ["le ", ""],
  "letters": "abcdefghijklmnopqrstuvwxyz",
  "joiners": "' -",
  "mostWords": 2,
  "inflects": ["s"],
  "examples": []
}
JSON
cat >"$root/xx/mnemonics.json" <<'JSON'
{
  "stories": {
    "B": {"meaning": "le sol se decolle et rien ne suit: le mur.", "nuance": "x", "reading": ""},
    "C": {"meaning": "", "nuance": "x", "reading": ""}
  }
}
JSON
cat >"$root/xx/anchors.json" <<'JSON'
{
  "anchors": {
    "\u3053": ["le coq", ["k", "o", "k"], 8],
    "\u3053\u3046": ["le coq", ["k", "o", "k"], 8],
    "\u3055": ["la scie", ["s", "i"], 9],
    "\u3057": ["le site", ["s", "i", "t"], 9],
    "\u3070": ["les boches", ["b", "\u0254", "\u0283"], 9],
    "\u3071": ["k", ["k", "a"], 9]
  },
  "left": {}
}
JSON

# Two answers one edit apart, and a claimed set naming neither of them while naming a word nothing
# answers with. Both halves of the rebuild check, in one file.
cat >"$root/xx/meanings.json" <<'JSON'
{ "header": {}, "meanings": { "I": ["nourriture"], "J": ["pourriture"] } }
JSON
cat >"$root/xx/vocabulary.json" <<'JSON'
{ "header": {}, "meanings": { "K": ["nourriture"] } }
JSON
cat >"$root/xx/claimed.json" <<'JSON'
{ "claimed": ["jamais ecrit"] }
JSON

refused=$(check "$root" 2>&1)
if [ -z "$refused" ]; then
  report 'the check accepted a locale written to be refused'
fi

for expected in 'not the locale' 'both keyed' 'no article' 'names more than one component' 'states a word twice' 'holds nothing for' 'stands for more than one reading' 'sit nearer than' 'the locale refuses' 'is one letter' 'names nothing for' 'no story at all' 'opens on nothing' 'claimed.json is missing' 'claimed.json still holds' 'claimed.json is not written'; do
  case "$refused" in
    *"$expected"*) ;;
    *) report "the check did not name: $expected" ;;
  esac
done

if [ "$fail" -eq 0 ]; then
  printf 'corpus: checked, and refuses what it claims to\n'
fi

exit "$fail"
