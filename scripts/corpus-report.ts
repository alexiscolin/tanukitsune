// What a locale still owes before its corpus can be written, and what its names already break.
//
// Run with `pnpm corpus:report [locale]`. With the inventory present it reports against the
// curriculum, which is what a session shows and therefore what coverage means; without it, against
// the whole decomposition, which is the road rather than the release.
//
// It reports and refuses nothing. The rule it serves is in docs/corpus.md: the model proposes
// everywhere and nothing is decided in silence, so what a run cannot settle leaves it named.

import { existsSync, readFileSync } from 'node:fs'

import {
  collidingNames,
  flatten,
  holdsTooManyParts,
  isFullyStated,
  MOST_PARTS,
  namesKanjiWrites,
  unnamedComponents,
  wordlessComponents,
} from '../src/core/corpus/decomposition.ts'
import type { Decomposition } from '../src/core/corpus/decomposition.ts'
import { list } from './corpus-command.ts'
import {
  readAnchors,
  readComponentNames,
  readDecompositions,
  readKeys,
  readStories,
  readTelling,
} from '../src/data/corpus/artifact.ts'
import { faultsInStories } from '../src/data/corpus/story-run.ts'
import type { Told } from '../src/data/corpus/story-run.ts'
import { cardsFrom } from '../src/data/corpus/publish.ts'
import { shapesNamedByTheirKanji, walkCurriculum } from '../src/data/corpus/curriculum.ts'
import type { InventorySubject } from '../src/data/corpus/inventory.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const locale = process.argv[2] ?? 'fr'
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
// Absent before a locale has been written at all, which is a state to report rather than to fail on:
// the report is what says what a language still owes, and a language owing everything owes it too.
const namesFile = `corpus/${locale}/components.json`
const names = existsSync(namesFile) ? readComponentNames(readFileSync(namesFile, 'utf8')) : {}

const shapeOf = (character: string) => decompositions.get(character) ?? []
const isNameable = (component: string) => names[component] !== undefined

// Read once rather than inside the walk, because the line reporting names a kanji key already writes
// needs the same subjects and the file is read from disk.
const inventory = existsSync(INVENTORY_FILE) ? readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8')) : null
const { read, unplaced, drawn, owed } = inventory === null ? againstShape() : againstCurriculum(inventory)

report('characters read', String(read.length))
report('characters the drawing does not decompose', list(read.filter((one) => one.parts.length === 0).map(characterOf)))
report('characters the source does not fully state', list(read.filter((one) => !isFullyStated(one)).map(characterOf)))
report(`characters opened past ${MOST_PARTS} parts`, list(read.filter(holdsTooManyParts).map(characterOf)))
report(`components ${locale} has not named`, list(owed))
report('parts the drawing does not place', list(unplaced))
report('names serving more than one component', list(collidingNames(names)))

if (drawn.length > 0) {
  report('components the curriculum draws rather than writes', list(drawn))
}

// Only where the curriculum is present: a story is judged against the card it sits on, and the
// curriculum is what says a card exists at all.
if (inventory !== null) reportStories(inventory.subjects, read)

// Only where the curriculum is present, since which shapes a kanji writes is what it says.
if (inventory !== null) {
  const kanji = shapesNamedByTheirKanji(inventory.subjects)

  report(`names ${locale} wrote where nothing owes one`, list(namesKanjiWrites(names, kanji)))
  report(`components ${locale} teaches under no word`, list(wordlessComponents(shapesAKanjiWrites(inventory.subjects, kanji), names, keyed())))
}

// The components a kanji writes, which are the ones no other line watches: they are owed no name of
// their own, so the line above counts them out, and a key is the only word they can have.
function shapesAKanjiWrites(subjects: readonly InventorySubject[], kanji: ReadonlySet<string>): readonly string[] {
  return subjects.flatMap((one) =>
    one.type === 'radical' && one.characters !== null && !one.hidden && kanji.has(one.characters)
      ? [one.characters]
      : [],
  )
}

// The keys themselves, absent before a run has written any.
function keysWritten(): Readonly<Record<string, string>> {
  const file = `corpus/${locale}/keys.json`

  return existsSync(file) ? readKeys(readFileSync(file, 'utf8')) : {}
}

// Absent before the keys are written, which is a locale owing every one of them rather than a fault.
function keyed(): ReadonlySet<string> {
  const file = `corpus/${locale}/keys.json`

  return existsSync(file) ? new Set(Object.keys(readKeys(readFileSync(file, 'utf8')))) : new Set()
}

function againstCurriculum(read: { upTo: number; subjects: readonly InventorySubject[] }) {
  process.stdout.write(`inventory: ${read.subjects.length} subjects to level ${read.upTo}\n`)

  return walkCurriculum(read.subjects, names, shapeOf)
}

// Against the whole decomposition, which is every character the drawing carries rather than the ones
// a release deals. It is the shape of the road: what naming would owe if the curriculum went that far.
function againstShape() {
  const read = [...decompositions].map(([character, parts]) => flatten(character, parts, isNameable))

  return { read, unplaced: [], drawn: [], owed: unnamedComponents(read, names) }
}

function characterOf(decomposition: Decomposition): string {
  return decomposition.character
}

function report(label: string, value: string): void {
  process.stdout.write(`${label}: ${value}\n`)
}

// What a card teaches, in the words the reader meets, for every kanji the curriculum deals. A story is
// judged against this and against nothing else, so the assembling is here where the files are and the
// rules stay where they can be tested.
function reportStories(subjects: readonly InventorySubject[], walked: readonly Decomposition[]): void {
  const file = `corpus/${locale}/mnemonics.json`
  const naming = `corpus/${locale}/naming.json`

  if (!existsSync(naming)) return

  const keys = keysWritten()
  const bound = anchored()
  const cards = cardsFrom(subjects, walked, { names, keys, bound })

  const written: ReadonlyMap<string, Told> = existsSync(file)
    ? readStories(readFileSync(file, 'utf8'))
    : new Map()
  const telling = readTelling(readFileSync(naming, 'utf8'))
  const has = (story: string) => story.trim() !== ''

  report(`kanji cards ${locale} owes a story`, String(cards.size))
  report('meaning stories written', String([...written.values()].filter((one) => has(one.meaning)).length))
  report('reading stories written', String([...written.values()].filter((one) => has(one.reading)).length))
  report('stories at fault', list(faultsInStories(written, cards, telling)))
}

// What each reading is bound to, absent until a run has bound anything.
function anchored(): ReadonlyMap<string, { readonly anchor: string; readonly phonemes: readonly string[] }> {
  const file = `corpus/${locale}/anchors.json`

  return existsSync(file) ? readAnchors(readFileSync(file, 'utf8')).bound : new Map()
}
