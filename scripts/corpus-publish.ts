// Writes a locale's finished cards into corpus_entry, which is the step between a folder of JSON and
// an application that can show a card.
//
// Run with `pnpm corpus:publish [locale]`. It writes what is ready and says what is not: a card whose
// story or nuance is missing is left for the report to name rather than written half.
//
// What a row records about its own making is decided rather than guessed. `generated_by` says which
// model wrote the text, or that none did: the transparency article applies to synthetic text, and a
// story somebody typed is not that. `corpus_version` is the commit the repository stood on, so a
// reader's answer can be traced back to the exact files that graded it.

import { execFileSync } from 'node:child_process'
import { sql } from 'drizzle-orm'
import { existsSync, readFileSync } from 'node:fs'

import { connect } from '../src/data/connect.ts'
import { LOCAL_DATA_DIR } from '../src/data/local-data-dir.ts'
import { asOptional } from '../src/data/optional-text.ts'
import { corpusEntry } from '../src/data/schema.ts'
import {
  readAnchors,
  readComponentNames,
  readDecompositions,
  readKeys,
  readMeanings,
  readStories,
  readTelling,
} from '../src/data/corpus/artifact.ts'
import { cardsFrom, rowsToPublish, wordFor } from '../src/data/corpus/publish.ts'
import { faultInTold } from '../src/data/corpus/story-run.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { list, loadLocalEnv } from './corpus-command.ts'

loadLocalEnv()

const locale = process.argv[2] ?? 'fr'
const at = (file: string) => `corpus/${locale}/${file}`

if (!existsSync(INVENTORY_FILE)) {
  process.stdout.write(`the curriculum is what says a card exists, and ${INVENTORY_FILE} is missing\n`)
  process.exit(1)
}

// Refused over a dirty tree rather than stamped with a commit that does not contain the text being
// written: the column exists so an answer can be traced to the files that graded it, and a sha naming
// files somebody has since edited traces to the wrong ones. Asked before anything is read, since every
// read after it would be discarded.
if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() !== '') {
  process.stdout.write('the tree carries changes, so no commit describes what would be published\n')
  process.exit(1)
}

// A run missing one of these publishes a card with a hole in it, and the table says published either
// way. Refused rather than defaulted, as the sibling refuses.
for (const needed of [
  'corpus/decomposition.json',
  at('components.json'),
  at('keys.json'),
  at('anchors.json'),
  at('naming.json'),
  at('mnemonics.json'),
  at('vocabulary.json'),
]) {
  if (!existsSync(needed)) throw new Error(`${needed} is missing. Run pnpm corpus to write it`)
}

const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const names = readComponentNames(readFileSync(at('components.json'), 'utf8'))
const keys = readKeys(readFileSync(at('keys.json'), 'utf8'))
const { bound } = readAnchors(readFileSync(at('anchors.json'), 'utf8'))
const telling = readTelling(readFileSync(at('naming.json'), 'utf8'))
const held = readStories(readFileSync(at('mnemonics.json'), 'utf8'))
// The first gloss, which is the one the run settled on: the file keeps the rest so a later pass can
// widen what an answer accepts, and the card asks for one word.
const words = Object.fromEntries(
  Object.entries(readMeanings(readFileSync(at('vocabulary.json'), 'utf8'))).flatMap(([word, glosses]) => {
    const first = glosses[0]

    return first === undefined ? [] : [[word, first] as const]
  }),
)
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))

const { read } = walkCurriculum(subjects, names, (character) => decompositions.get(character) ?? [])

const cards = cardsFrom(subjects, read, { names, keys, bound })

// A story at fault is left where it is rather than written: the report is what names it, and a table
// carrying a story the report refuses grades a reader against text nobody accepted.
const wrong: string[] = []
const written = new Map(
  [...held].filter(([character, told]) => {
    const card = cards.get(character)

    if (card === undefined) return true
    if (faultInTold(told, card, telling) === null) return true

    wrong.push(character)

    return false
  }),
)

const wrote = { names, keys, words, bound }
const version = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const rows = rowsToPublish(subjects, { wrote, cards, written }, {
  locale,
  writtenBy: 'hand',
  promptVersion: '',
  corpusVersion: version,
})

// What the curriculum deals and the locale has no word for, which is the one thing that keeps a
// subject out of the table entirely.
const short = subjects.flatMap((subject) =>
  !subject.hidden && subject.characters !== null && wordFor(subject, wrote) === undefined
    ? [subject.characters]
    : [],
)

const owing = `dealt but unanswerable in ${locale}, no word written: ${list(short)}\nheld back, at fault against the rules: ${list(wrong)}\n`

if (rows.length === 0) {
  process.stdout.write(`nothing ready to publish for ${locale}\n`)
  process.stdout.write(owing)
  process.exit(0)
}

const database = await connect({
  url: asOptional(process.env['DATABASE_URL']),
  directory: asOptional(process.env['TANUKITSUNE_LOCAL_DATABASE']) ?? LOCAL_DATA_DIR,
})

// Written again rather than skipped, so a story corrected in the folder reaches the table on the next
// run: the row is keyed by subject and locale, and what a run publishes is what the folder says today.
await database
  .insert(corpusEntry)
  .values(rows.map((row) => ({ ...row, parts: [...row.parts], anchorPhonemes: row.anchorPhonemes ? [...row.anchorPhonemes] : null })))
  .onConflictDoUpdate({
    target: [corpusEntry.subjectId, corpusEntry.locale],
    set: {
      meaning: sql`excluded.meaning`,
      nuance: sql`excluded.nuance`,
      mnemonic: sql`excluded.mnemonic`,
      readingMnemonic: sql`excluded.reading_mnemonic`,
      reading: sql`excluded.reading`,
      anchor: sql`excluded.anchor`,
      anchorPhonemes: sql`excluded.anchor_phonemes`,
      parts: sql`excluded.parts`,
      generatedBy: sql`excluded.generated_by`,
      promptVersion: sql`excluded.prompt_version`,
      corpusVersion: sql`excluded.corpus_version`,
    },
  })

process.stdout.write(`published: ${rows.length} of the ${cards.size} cards ${locale} owes, at ${version.slice(0, 8)}\n`)
process.stdout.write(owing)

// The file-backed driver holds the process open, so a command that has written everything it came to
// write says so rather than hanging on a connection nobody is waiting for.
process.exit(0)
