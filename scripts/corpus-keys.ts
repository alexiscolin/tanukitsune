// Turns the KANJIDIC2 release into the keys a locale teaches, written to corpus/<locale>/keys.json.
//
// Run with `pnpm corpus:keys [locale] [path]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It takes the release path as an argument, or fetches the pinned one.
//
// A key is selected from a gloss the source already states and then made unique, per docs/corpus.md.
// What no gloss can settle is reported rather than invented.
//
// The English the account grades on is not written here. It is the account's, so it stays in the
// uncommitted inventory that already carries it and never reaches a file that travels.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { fetched, list } from './corpus-command.ts'
import { chooseKeys, isOrderOf } from '../src/core/corpus/key.ts'
import { readKeyOrder } from '../src/data/corpus/artifact.ts'
import { parseGlosses } from '../src/data/corpus/kanjidic.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const RELEASE = '2026-08-11'
const SOURCE = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'

const HEADER = {
  source: 'KANJIDIC2 (https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), Electronic Dictionary Research and Development Group',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  release: RELEASE,
  modified: 'One gloss selected per character and made unique. The readings, grades and stroke counts are not carried.',
  shape: 'character to the key this locale teaches it under',
}

const locale = process.argv[2] ?? 'fr'
const given = process.argv[3]
const output = `corpus/${locale}/keys.json`

const xml = given === undefined ? await fetched(SOURCE, 'KANJIDIC2') : readFileSync(given, 'utf8')
const spoken = parseGlosses(xml, locale)

// The order the reader meets them in, so the plainest word goes to the character taught first and a
// later one takes the next gloss it has. Sorted here rather than trusted from the file, since the
// selection is only reproducible if the order is.
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const characters = subjects
  .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
  .sort((one, other) => one.level - other.level || one.id - other.id)
  .map((one) => one.characters as string)

// Where a run has weighed a character's glosses, that order is walked instead of the dictionary's.
// Absent before the first such run and never required: a character nobody weighed keeps the order the
// release states, so this command answers with or without a model having spoken.
const carriedFile = `corpus/${locale}/key-translation.json`
// A word carried across from the English, for a character the release does not gloss in this locale at
// all. It arrives as the character's only gloss, so selection and uniqueness are unchanged by it.
const carried: ReadonlyMap<string, readonly string[]> = existsSync(carriedFile)
  ? readKeyOrder(readFileSync(carriedFile, 'utf8'))
  : new Map()

const orderFile = `corpus/${locale}/key-choice.json`
const chosen: ReadonlyMap<string, readonly string[]> = existsSync(orderFile)
  ? readKeyOrder(readFileSync(orderFile, 'utf8'))
  : new Map()

// An order settled over glosses the release has since restated, or that a cleaning rule has moved, no
// longer describes them. It is walked past rather than trusted, and said rather than walked past in
// silence: it is a judgement already paid for that this run is not using.
const stale: string[] = []

// The shapes the curriculum deals as radicals, which are the ones a story has to be able to name.
const naming = new Set(
  subjects.flatMap((one) => (one.type === 'radical' && one.characters !== null && !one.hidden ? [one.characters] : [])),
)

// The glosses a character actually has here, read once so the run and the report answer the same
// question: a character carried across has words, and calling it unglossed names the wrong reason.
const glossesFor = (character: string) => {
  const stated = spoken.get(character) ?? []

  return stated.length === 0 ? (carried.get(character) ?? []) : stated
}

const keyed = chooseKeys(
  characters,
  (character) => {
    const glosses = glossesFor(character)
    const order = chosen.get(character)

    if (order === undefined) return glosses
    if (isOrderOf(order, glosses)) return order

    stale.push(character)

    return glosses
  },
  naming,
)

const written = characters.filter((character) => keyed.keys[character] !== undefined)

const lines = written
  .map((character) => `${JSON.stringify(character)}:${JSON.stringify(keyed.keys[character])}`)
  .join(',\n')

writeFileSync(output, `{\n"header":${JSON.stringify(HEADER)},\n"keys":{\n${lines}\n}\n}\n`)

process.stdout.write(`keys: ${written.length} of ${characters.length} written to ${output}\n`)
// The two reasons a character leaves the run without a key, apart, because they are settled by
// different things: one waits on a gloss to be written, the other on a word to be freed.
const unglossed = keyed.unsettled.filter((one) => glossesFor(one).length === 0)

process.stdout.write(`orders no longer describing their glosses, weighed again: ${list(stale)}\n`)
process.stdout.write(`no word to select from, neither stated nor carried across: ${list(unglossed)}\n`)
process.stdout.write(
  `every gloss the release states is already a key: ${list(keyed.unsettled.filter((one) => !unglossed.includes(one)))}\n`,
)


