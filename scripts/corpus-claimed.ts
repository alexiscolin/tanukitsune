// Writes the words the judge's fuzzy tier may not place an answer on, to corpus/<locale>/claimed.json.
//
// Run with `pnpm corpus:claimed [locale]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states.
//
// Tier 2 tolerates a mistyped letter, and French punishes that: nourriture and pourriture are one edit
// apart and mean opposite things. Every word the locale answers some card with is written here, and the grader refuses to place a near miss on one
// rather than teaching the reader the other card's word. docs/specs/v0.1.md holds the rule.
//
// Derived rather than curated: a list somebody reviewed by hand goes stale the first time a word is
// rewritten, and the count it claims cannot be checked.
//
// Read from the committed files alone and never from the inventory, which carries the reader's account
// and does not travel. What that costs is a set covering the whole locale rather than the levels dealt,
// so a near miss can be refused for landing on a word no dealt card teaches. What it buys is a file
// anybody can rebuild and a check that can run where the account cannot.
//
// The words are the releases' glosses, folded, so the file carries their attribution: it is bundled into
// the page that grades, and the obligation follows the derived file wherever it is served.

import { readFileSync, writeFileSync } from 'node:fs'

import { claimedWords } from '../src/core/corpus/answers.ts'
import { answersIn } from '../src/data/corpus/artifact.ts'

const locale = process.argv[2] ?? 'fr'
const at = (file: string) => `corpus/${locale}/${file}`

const accepted = answersIn((file) => readFileSync(at(file), 'utf8'))

const claimed = claimedWords(accepted)
const counted = `${claimed.length} words, from ${new Set(accepted).size} spellings`

const file = {
  header: {
    what: "The words the judge's fuzzy tier may not place a near miss on: every word this locale answers some card with.",
    source: 'KANJIDIC2 (https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) and JMdict, Electronic Dictionary Research and Development Group, for the glosses of meanings.json and vocabulary.json; the component names and the words key-translation.json lists are written for this corpus',
    licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), for the words derived from those releases',
    how: 'Written by pnpm corpus:claimed from components.json, keys.json, meanings.json and vocabulary.json, read the way src/core/grading/fuzzy.ts reads an answer: ligatures and the curly apostrophe written out, accents folded, case folded, a leading definite article or reflexive pronoun dropped.',
    counted,
    shape: 'the words, folded the way an answer is read, in order',
  },
  claimed,
}

writeFileSync(at('claimed.json'), `${JSON.stringify(file, null, 2)}\n`)

process.stdout.write(`${counted}\n`)
