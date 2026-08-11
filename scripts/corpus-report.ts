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
} from '../src/core/corpus/decomposition.ts'
import type { Decomposition } from '../src/core/corpus/decomposition.ts'
import { list } from './corpus-command.ts'
import { readComponentNames, readDecompositions } from '../src/data/corpus/artifact.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import type { InventorySubject } from '../src/data/corpus/inventory.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const locale = process.argv[2] ?? 'fr'
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const names = readComponentNames(readFileSync(`corpus/${locale}/components.json`, 'utf8'))

const shapeOf = (character: string) => decompositions.get(character) ?? []
const isNameable = (component: string) => names[component] !== undefined

// Read once rather than inside the walk, because the line reporting names a kanji key already writes
// needs the same subjects and the file is read from disk.
const inventory = existsSync(INVENTORY_FILE) ? readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8')) : null
const { read, unplaced, drawn, owed } = inventory === null ? againstShape() : againstCurriculum(inventory)

report('characters read', String(read.length))
report('characters the drawing does not decompose', list(read.filter((one) => one.parts.length === 0).map(named)))
report('characters the source does not fully state', list(read.filter((one) => !isFullyStated(one)).map(named)))
report(`characters opened past ${MOST_PARTS} parts`, list(read.filter(holdsTooManyParts).map(named)))
report(`components ${locale} has not named`, list(owed))
report('parts the drawing does not place', list(unplaced))
report('names serving more than one component', list(collidingNames(names)))

if (drawn.length > 0) {
  report('components the curriculum draws rather than writes', list(drawn))
}

// Only where the curriculum is present, since which shapes a kanji writes is what it says.
if (inventory !== null) {
  report(`names ${locale} wrote on a component a kanji writes`, list(namesKanjiWrites(names, written(inventory.subjects))))
}

function againstCurriculum(read: { upTo: number; subjects: readonly InventorySubject[] }) {
  process.stdout.write(`inventory: ${read.subjects.length} subjects to level ${read.upTo}\n`)

  return walkCurriculum(read.subjects, names, shapeOf)
}

// Withdrawn kanji left out on the same terms as the walk, or the two disagree and one report says a
// shape is owed a name while the next line says a kanji already writes it.
function written(subjects: readonly InventorySubject[]): ReadonlySet<string> {
  return new Set(
    subjects.flatMap((one) => (one.type === 'kanji' && one.characters !== null && !one.hidden ? [one.characters] : [])),
  )
}

// Against the whole decomposition, which is every character the drawing carries rather than the ones
// a release deals. It is the shape of the road: what naming would owe if the curriculum went that far.
function againstShape() {
  const read = [...decompositions].map(([character, parts]) => flatten(character, parts, isNameable))

  return { read, unplaced: [], drawn: [], owed: unnamedComponents(read, names) }
}

function named(decomposition: Decomposition): string {
  return decomposition.character
}


function report(label: string, value: string): void {
  process.stdout.write(`${label}: ${value}\n`)
}
