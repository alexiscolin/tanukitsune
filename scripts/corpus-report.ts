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
import { partsTaught } from '../src/core/corpus/taught.ts'
import { readComponentNames, readDecompositions } from '../src/data/corpus/artifact.ts'
import { readInventoryFile } from '../src/data/corpus/inventory.ts'

const INVENTORY = 'corpus/.inventory.json'

const locale = process.argv[2] ?? 'fr'
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const names = readComponentNames(readFileSync(`corpus/${locale}/components.json`, 'utf8'))

const shapeOf = (character: string) => decompositions.get(character) ?? []
const isNameable = (component: string) => names[component] !== undefined

const { read, unplaced, unnamedByShape } = existsSync(INVENTORY) ? againstCurriculum() : againstShape()

report('characters read', String(read.length))
report('characters the source does not fully state', list(read.filter((one) => !isFullyStated(one)).map(named)))
report(`characters opened past ${MOST_PARTS} parts`, list(read.filter(holdsTooManyParts).map(named)))
report(`parts ${locale} has not named`, list(unnamedComponents(read, names)))
report('parts the drawing does not place', list(unplaced))
report('names serving more than one component', list(collidingNames(names)))

if (unnamedByShape.length > 0) {
  report('components the curriculum draws rather than writes', list(unnamedByShape))
}

// Against the curriculum: the parts of a story are the components the reader has been dealt a card
// for, per docs/decisions/0013-the-curriculum-decides-the-parts.md.
function againstCurriculum() {
  const { upTo, subjects } = readInventoryFile(readFileSync(INVENTORY, 'utf8'))
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))

  process.stdout.write(`inventory: ${subjects.length} subjects to level ${upTo}\n`)

  const read: Decomposition[] = []
  const unplaced: string[] = []
  const drawn = new Set<string>()

  for (const subject of subjects) {
    if (subject.characters === null) {
      // A component the curriculum draws instead of writing cannot be named by its character, so it
      // is reported rather than silently missing from every story that would have used it.
      drawn.add(`${subject.type}#${subject.id}`)
      continue
    }
    if (subject.componentIds.length === 0) continue

    const components = subject.componentIds.flatMap((id) => {
      const component = byId.get(id)

      return component?.characters === undefined || component.characters === null ? [] : [component.characters]
    })

    const decomposition = partsTaught(subject.characters, components, shapeOf(subject.characters))
    read.push(decomposition)

    for (const part of decomposition.parts) {
      if (part.component !== null && part.position === null) unplaced.push(`${subject.characters}:${part.component}`)
    }
  }

  return { read, unplaced, unnamedByShape: [...drawn] }
}

// Against the whole decomposition, which is every character the drawing carries rather than the ones
// a release deals. It is the shape of the road: what naming would owe if the curriculum went that far.
function againstShape() {
  const read = [...decompositions].map(([character, parts]) => flatten(character, parts, isNameable))

  return { read, unplaced: [], unnamedByShape: [] }
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
