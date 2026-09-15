// Writes the words the judge's fuzzy tier may not place an answer on, to corpus/<locale>/claimed.json.
//
// Run with `pnpm corpus:claimed [locale]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states.
//
// Tier 2 tolerates a mistyped letter, and French punishes that: nourriture and pourriture are one edit
// apart and mean opposite things, and the curriculum holds two thousand more such pairs. Every word
// another answer sits that close to is written here, and the grader refuses to place an answer on one
// rather than teaching the reader the other card's word. docs/specs/v0.1.md holds the rule.
//
// Derived rather than curated: a list somebody reviewed by hand goes stale the first time a word is
// rewritten, and the count it claims cannot be checked.
//
// Read from the committed files alone and never from the inventory, which carries the reader's account
// and does not travel. What that costs is a set covering the whole locale rather than the levels dealt,
// which can only refuse an answer the shorter set would also have refused. What it buys is a file
// anybody can rebuild and a check that can run where the account cannot.

import { readFileSync, writeFileSync } from 'node:fs'

import { claimedWords } from '../src/core/corpus/answers.ts'
import { SHORTEST_TYPO } from '../src/core/grading/fuzzy.ts'
import { answersIn } from '../src/data/corpus/artifact.ts'

const locale = process.argv[2] ?? 'fr'
const at = (file: string) => `corpus/${locale}/${file}`

const accepted = answersIn((file) => readFileSync(at(file), 'utf8'))

const claimed = claimedWords(accepted)

const file = {
  header: {
    what: "The words the judge's fuzzy tier may not place an answer on. Each is a word this locale answers some card with, and each sits within one edit of another such word.",
    how: `Written by pnpm corpus:claimed from components.json, meanings.json and vocabulary.json, read the way src/core/grading/fuzzy.ts reads an answer: accents folded, case folded, a leading article dropped. A pair shorter than ${SHORTEST_TYPO} letters is left out, the tier refusing it on length alone.`,
    counted: `${claimed.length} of ${new Set(accepted).size} words the locale answers with`,
    shape: 'the words, folded the way an answer is read, in order',
  },
  claimed,
}

writeFileSync(at('claimed.json'), `${JSON.stringify(file, null, 2)}\n`)

process.stdout.write(`${claimed.length} words claimed of ${new Set(accepted).size} the locale answers with\n`)
