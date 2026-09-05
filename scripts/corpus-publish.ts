// Writes a locale's finished cards into corpus_entry, which is the step between a folder of JSON and
// an application that can show a card.
//
// Run with `pnpm corpus:publish [locale]`. It walks the curriculum and writes a row for every subject
// the locale has a word for, whether or not a story has been written yet: a card answered in the
// reader's language is worth more than a card in somebody else's, and the empty story columns are what
// the read turns into an absent block. What it cannot write, it names.
//
// What a row records about its own making is decided rather than guessed. `generated_by` names the
// model the run reaches, on every row: no artifact records who wrote one entry of it, so the column
// cannot separate a word a dictionary supplied from one a model wrote, and between over-claiming and
// under-claiming only the second is what the transparency article exists to prevent. Naming a text as
// generated when a dictionary supplied it costs the reader nothing; the reverse is the failure.
// `corpus_version` is the commit the repository stood on, so a reader's answer can be traced back to
// the exact files that graded it.

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
import { cardsFrom, rowsToPublish, shapeCards, wordCards, wordFor } from '../src/data/corpus/publish.ts'
import { faultInTold } from '../src/data/corpus/story-run.ts'
import type { Card, Told } from '../src/data/corpus/story-run.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { CORPUS_MODEL } from '../src/ai/corpus/request.ts'
import { list, loadLocalEnv } from './corpus-command.ts'
import { drawnKey } from '../src/core/corpus/decomposition.ts'

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
// Absent until a locale has written one, which is a state to report rather than to fail on.
const heldShapes: ReadonlyMap<string, Told> = existsSync(at('shapes.json'))
  ? readStories(readFileSync(at('shapes.json'), 'utf8'))
  : new Map()
const heldWords: ReadonlyMap<string, Told> = existsSync(at('words.json'))
  ? readStories(readFileSync(at('words.json'), 'utf8'))
  : new Map()
// The first gloss, which is the one the run settled on: the file keeps the rest so a later pass can
// widen what an answer accepts, and the card asks for one word.
const words = Object.fromEntries(
  Object.entries(readMeanings(readFileSync(at('vocabulary.json'), 'utf8'))).map(([word, glosses]) => [
    word,
    glosses[0] as string,
  ]),
)
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))

const { read } = walkCurriculum(subjects, names, (character) => decompositions.get(character) ?? [])

const cards = cardsFrom(subjects, read, { names, keys, bound })

// A story at fault is left where it is rather than written: the report is what names it, and a table
// carrying a story the report refuses grades a reader against text nobody accepted.
const wrong: string[] = []

// Held to the same rule the report holds them to, and against the same assembly: a story the report
// refuses must not reach the table by a second path.
const kept = (held: ReadonlyMap<string, Told>, cards: ReadonlyMap<string, Card>) =>
  new Map(
    [...held].filter(([key, told]) => {
      const card = cards.get(key)

      if (card === undefined || faultInTold(told, card, telling) === null) return true

      wrong.push(key)

      return false
    }),
  )

const wrote = { names, keys, words, bound }
const written = kept(held, cards)
const shapes = kept(heldShapes, shapeCards(subjects, names))
const wordStories = kept(heldWords, wordCards(subjects, wrote, telling))

// Withdrawn content is dealt to nobody, so it is neither owed a row nor counted against the ones
// written: a ratio whose denominator holds cards no session shows is a ratio nothing can reach.
const dealt = subjects.filter((subject) => !subject.hidden)
const version = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const rows = rowsToPublish(subjects, { wrote, cards, written, shapes, words: wordStories }, {
  locale,
  writtenBy: CORPUS_MODEL,
  promptVersion: '',
  corpusVersion: version,
})

// What the curriculum deals and the locale has no word for, which is the one thing that keeps a
// subject out of the table. A shape the curriculum draws has no character to print, so it is named
// here the way the locale names it, or the one case with nothing to show would show nothing.
const short = dealt.flatMap((subject) =>
  wordFor(subject, wrote) === undefined ? [subject.characters ?? drawnKey(subject)] : [],
)

const owing = `dealt but unanswerable in ${locale}, no word written: ${list(short)}\nheld back, at fault against the rules: ${list(wrong)}\n`

// Refused rather than published short. Holding the story back leaves the row, and a row without its
// story is written with an empty mnemonic, so the card reaches the reader blank and the run says it
// succeeded. The whole publish stops instead: the folder is what a run publishes, and a folder holding
// a story its own rule refuses is not ready to be one.
if (wrong.length > 0) {
  process.stdout.write(owing)
  process.exit(1)
}

if (rows.length === 0) {
  process.stdout.write(`nothing ready to publish for ${locale}\n`)
  process.stdout.write(owing)
  process.exit(0)
}

const database = await connect({
  url: asOptional(process.env['DATABASE_URL']),
  directory: asOptional(process.env['TANUKITSUNE_LOCAL_DATABASE']) ?? LOCAL_DATA_DIR,
})

// A statement at a time rather than the whole curriculum in one, because a driver binds every column
// of every row as a parameter: nine thousand rows of fifteen columns is a hundred and forty thousand
// of them, past what a statement may carry and past what the driver can even assemble.
const AT_A_TIME = 500

// Written again rather than skipped, so a story corrected in the folder reaches the table on the next
// run: the row is keyed by subject and locale, and what a run publishes is what the folder says today.
for (let from = 0; from < rows.length; from += AT_A_TIME) {
  await database
    .insert(corpusEntry)
    .values(
      rows
        .slice(from, from + AT_A_TIME)
        .map((row) => ({ ...row, parts: [...row.parts], anchorPhonemes: row.anchorPhonemes ? [...row.anchorPhonemes] : null })),
    )
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
}

process.stdout.write(
  `published: ${rows.length} of the ${dealt.length} subjects the curriculum deals, at ${version.slice(0, 8)}\n`,
)
process.stdout.write(owing)

// The file-backed driver holds the process open, so a command that has written everything it came to
// write says so rather than hanging on a connection nobody is waiting for.
process.exit(0)
