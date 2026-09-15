// Writes the words the fuzzy tier may not reach for, to corpus/<locale>/claimed.json.
//
// Run with `pnpm corpus:claimed [locale]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It reads the same files corpus:publish reads and assembles the
// answers through the same function, so the set the table accepts and the set this guards cannot
// drift apart.
//
// Tier 2 tolerates a mistyped letter, and French punishes that: nourriture and pourriture are one edit
// apart and mean opposite things, and so are two thousand other pairs this curriculum happens to hold.
// Every word another answer sits that close to is written here, and the grader refuses to place one
// rather than teaching the reader the other card's word. docs/specs/v0.1.md holds the rule.
//
// Derived rather than curated: a list somebody reviewed by hand is a list that goes stale the first
// time a word is rewritten, and the count it claims cannot be checked.

import { readFileSync, writeFileSync } from 'node:fs'

import { alsoAcceptedFor, claimedWords } from '../src/core/corpus/answers.ts'
import { SHORTEST_TYPO } from '../src/core/grading/fuzzy.ts'
import { readMeanings } from '../src/data/corpus/artifact.ts'
import { answersFor } from '../src/data/corpus/publish.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { readComponentNames, readKeys } from '../src/data/corpus/artifact.ts'

const locale = process.argv[2] ?? 'fr'
const at = (file: string) => `corpus/${locale}/${file}`

const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const names = readComponentNames(readFileSync(at('components.json'), 'utf8'))
const keys = readKeys(readFileSync(at('keys.json'), 'utf8'))
const glosses = {
  kanji: readMeanings(readFileSync(at('meanings.json'), 'utf8')),
  words: readMeanings(readFileSync(at('vocabulary.json'), 'utf8')),
}
const words = Object.fromEntries(
  Object.entries(glosses.words).map(([word, wrote]) => [word, wrote[0] as string]),
)

// The anchors decide no answer, so the assembly is handed an empty table rather than the file.
const answers = answersFor(subjects, { names, keys, words, bound: new Map() }, glosses)
const accepts = alsoAcceptedFor(answers)
const everyAnswer = [...answers].flatMap(([id, { shown }]) => [shown, ...(accepts.get(id) ?? [])])
const claimed = claimedWords(everyAnswer)

const file = {
  header: {
    what: 'The words the fuzzy tier of the judge may not place an answer on. Each is a word this locale answers some card with, and each sits within one edit of another such word.',
    how: `Written by pnpm corpus:claimed from what the cards accept, the way src/core/grading/fuzzy.ts reads an answer: accents folded, case folded, a leading article dropped. A pair shorter than ${SHORTEST_TYPO} letters is left out, the tier refusing it on length alone.`,
    counted: `${claimed.length} of ${new Set(everyAnswer).size} words the cards accept`,
    shape: 'the words, folded the way an answer is read, in order',
  },
  claimed,
}

writeFileSync(at('claimed.json'), `${JSON.stringify(file, null, 2)}\n`)

process.stdout.write(`${claimed.length} words claimed of ${new Set(everyAnswer).size} the cards accept\n`)
