// What a locale still owes before its corpus can be written, and what its names already break.
//
// Run with `pnpm corpus:report [locale] [characters]`. With no characters it reads the whole
// decomposition, which is the road; with a string of them it reads that set, which is a release.
//
// It reports and refuses nothing. The rule it serves is in docs/corpus.md: the model proposes
// everywhere and nothing is decided in silence, so what a run cannot settle leaves it named.

import { readFileSync } from 'node:fs'

import {
  collidingNames,
  flatten,
  holdsTooManyParts,
  isFullyStated,
  MOST_PARTS,
  unnamedComponents,
} from '../src/core/corpus/decomposition.ts'
import { readComponentNames, readDecompositions } from '../src/data/corpus/artifact.ts'

const locale = process.argv[2] ?? 'fr'
const wanted = process.argv[3]

const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const names = readComponentNames(readFileSync(`corpus/${locale}/components.json`, 'utf8'))

const characters = wanted === undefined ? [...decompositions.keys()] : [...wanted]
const isNameable = (component: string) => names[component] !== undefined

const flattened = characters.flatMap((character) => {
  const parts = decompositions.get(character)

  return parts === undefined ? [] : [flatten(character, parts, isNameable)]
})

const missing = unnamedComponents(flattened, names)
const collisions = collidingNames(names)
const unstated = flattened.filter((decomposition) => !isFullyStated(decomposition))
const crowded = flattened.filter(holdsTooManyParts)

report(`characters read`, String(flattened.length))
report(`characters the source does not fully state`, list(unstated.map((one) => one.character)))
report(`characters opened past ${MOST_PARTS} parts`, list(crowded.map((one) => one.character)))
report(`components ${locale} has not named`, list(missing))
report(`names serving more than one component`, list(collisions))

if (wanted !== undefined && characters.length !== flattened.length) {
  report(`characters the decomposition does not carry`, list(characters.filter((c) => !decompositions.has(c))))
}

function list(entries: readonly string[]): string {
  if (entries.length === 0) return '0'

  const shown = entries.slice(0, 20).join(' ')

  return entries.length > 20 ? `${entries.length}, first 20: ${shown}` : `${entries.length}: ${shown}`
}

function report(label: string, value: string): void {
  process.stdout.write(`${label}: ${value}\n`)
}
