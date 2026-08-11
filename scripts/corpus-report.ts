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
  unnamedComponents,
} from '../src/core/corpus/decomposition.ts'
import type { Decomposition } from '../src/core/corpus/decomposition.ts'
import { readComponentNames, readDecompositions } from '../src/data/corpus/artifact.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const locale = process.argv[2] ?? 'fr'
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const names = readComponentNames(readFileSync(`corpus/${locale}/components.json`, 'utf8'))

const shapeOf = (character: string) => decompositions.get(character) ?? []
const isNameable = (component: string) => names[component] !== undefined

const { read, unplaced, drawn, owed } = existsSync(INVENTORY_FILE) ? againstCurriculum() : againstShape()

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

function againstCurriculum() {
  const { upTo, subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

  process.stdout.write(`inventory: ${subjects.length} subjects to level ${upTo}\n`)

  return walkCurriculum(subjects, names, shapeOf)
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

function list(entries: readonly string[]): string {
  if (entries.length === 0) return '0'

  const shown = entries.slice(0, 20).join(' ')

  return entries.length > 20 ? `${entries.length}, first 20: ${shown}` : `${entries.length}: ${shown}`
}

function report(label: string, value: string): void {
  process.stdout.write(`${label}: ${value}\n`)
}
