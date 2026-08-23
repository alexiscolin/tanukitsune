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

import { fetched, KANJIDIC, list, taughtCharacters } from './corpus-command.ts'
import { chooseKeys, faultInKey, isOrderOf } from '../src/core/corpus/key.ts'
import { meaningsFile, readKeyOrder, readNaming } from '../src/data/corpus/artifact.ts'
import { parseGlosses, releaseOf } from '../src/data/corpus/kanjidic.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

// Written by the run rather than fixed here, because the release states its own version and the address
// serving it does not.
const headerFor = (release: string, ours: readonly string[]) => ({
  source: 'KANJIDIC2 (https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), Electronic Dictionary Research and Development Group',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), for the words selected from that release',
  release,
  modified: 'One gloss selected per character and made unique. The readings, grades and stroke counts are not carried.',
  written: `${ours.length} of these words are not the release's and are not covered by its licence: where it glosses a character in no French word this corpus can still use, the word is written for this corpus from the English meaning. They are listed in key-translation.json.`,
  shape: 'character to the key this locale teaches it under',
})

const locale = process.argv[2] ?? 'fr'
const given = process.argv[3]
const output = `corpus/${locale}/keys.json`
const meaningsOutput = `corpus/${locale}/meanings.json`

const xml = given === undefined ? await fetched(KANJIDIC, 'KANJIDIC2') : readFileSync(given, 'utf8')
const spoken = parseGlosses(xml, locale)

// The order the reader meets them in, so the plainest word goes to the character taught first and a
// later one takes the next gloss it has. Sorted here rather than trusted from the file, since the
// selection is only reproducible if the order is.
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
// What this language can write, which is what says whether a gloss is a word here at all.
const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const characters = taughtCharacters(subjects)

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

// The shapes the curriculum deals as radicals, which are the ones a story has to be able to name.
const shapes = new Set(
  subjects.flatMap((one) => (one.type === 'radical' && one.characters !== null && !one.hidden ? [one.characters] : [])),
)

const stale: string[] = []

// The glosses a character has here, read once so the run and the report answer the same question. A
// weighed order describes the stated glosses and nothing else, so it is applied to those; a word written
// for the character follows them rather than replacing them, since a character can state glosses and
// have every one of them answering for somebody else.
const glossesFor = (character: string) => {
  const stated = spoken.get(character) ?? []
  const order = chosen.get(character)
  const after = (glosses: readonly string[]) => [
    ...glosses,
    ...(carried.get(character) ?? []).filter((one) => !glosses.includes(one)),
  ]

  if (order === undefined) return after(stated)
  if (isOrderOf(order, stated)) return after(order)
  if (stated.length > 0) stale.push(character)

  return after(stated)
}

const keyed = chooseKeys(characters, glossesFor, shapes)

const written = characters.filter((character) => keyed.keys[character] !== undefined)

const lines = written
  .map((character) => `${JSON.stringify(character)}:${JSON.stringify(keyed.keys[character])}`)
  .join(',\n')

const ours = written.filter((character) => (spoken.get(character) ?? []).every((one) => one !== keyed.keys[character]))

writeFileSync(
  output,
  `{\n"header":${JSON.stringify(headerFor(releaseOf(xml), ours))},\n"keys":{\n${lines}\n}\n}\n`,
)

// The key leads and every other gloss the character has follows it. A key is one word and a character
// often means several, so keeping only the key would grade a reader wrong for a word the release
// states. Written from the same ordered glosses the key was picked from, in the same pass, or the two
// files would disagree about which word leads.
const meanings = Object.fromEntries(
  written.map((character) => {
    const key = keyed.keys[character] as string
    // The same rule the key passed, since a gloss this language cannot write is not a word a reader
    // types: the release states counters and calendar signs among the meanings, and grading somebody
    // right for "signe de la 1ere branche terrestre" is grading nothing.
    const rest = glossesFor(character).filter((one) => one !== key && faultInKey(one, naming) === null)

    return [character, [key, ...rest]]
  }),
)

writeFileSync(meaningsOutput, meaningsFile({ header: headerFor(releaseOf(xml), ours), meanings }))

process.stdout.write(`keys: ${written.length} of ${characters.length} written to ${output}\n`)
process.stdout.write(`meanings: ${Object.values(meanings).reduce((all, one) => all + one.length, 0)} written to ${meaningsOutput}\n`)
// The two reasons a character leaves the run without a key, apart, because they are settled by
// different things: one waits on a gloss to be written, the other on a word to be freed.
const unglossed = keyed.unsettled.filter((one) => glossesFor(one).length === 0)

// What the read left behind that the locale cannot write. The cleaning takes the shapes a dictionary
// carries and a card does not, and a shape it does not know about survives it silently, so the run says
// what it saw rather than selecting around it in silence.
const unwritable = characters.flatMap((character) =>
  (spoken.get(character) ?? [])
    .filter((gloss) => faultInKey(gloss, naming) !== null)
    .map((gloss) => `${character} ${gloss}`),
)

process.stdout.write(
  `keys a rescue moved: ${list(keyed.moved.map((one) => `${one.character} ${one.from} to ${one.to}`))}\n`,
)
process.stdout.write(`glosses ${locale} cannot write, which the selection can still reach: ${list(unwritable)}\n`)
process.stdout.write(`orders no longer describing their glosses, weighed again: ${list([...new Set(stale)])}\n`)
process.stdout.write(`no word to select from, neither stated nor carried across: ${list(unglossed)}\n`)
process.stdout.write(
  `every gloss the release states is already a key: ${list(keyed.unsettled.filter((one) => !unglossed.includes(one)))}\n`,
)
