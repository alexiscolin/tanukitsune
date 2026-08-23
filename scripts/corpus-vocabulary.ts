// What each word of the curriculum means in one locale, read from a dictionary rather than asked of a
// model. A meaning is a fact somebody has already written down, and a fact taken from a dictionary can
// be checked against it while a fact a model invented can only be checked by a person reading six
// thousand words.
//
// Run with `pnpm corpus:vocabulary [locale]`. It reaches no model and spends nothing.
//
// A word the release does not gloss here is left out rather than half-written, and what is left out is
// what a later run asks for. The rule the corpus follows everywhere holds here: what a table can
// decide, the table decides.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { fetched, list } from './corpus-command.ts'
import { meaningsFile, readMeanings } from '../src/data/corpus/artifact.ts'
import { parseWords } from '../src/data/corpus/jmdict.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

// Where JMdict is served from. One rolling file rather than a versioned one, which is why what a run
// read is taken from the release itself and written down beside what it produced.
const JMDICT = 'http://ftp.edrdg.org/pub/Nihongo/JMdict.gz'

const locale = process.argv[2] ?? 'fr'
const output = `corpus/${locale}/vocabulary.json`

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`${INVENTORY_FILE} is missing. Run pnpm corpus:inventory first, since what is owed is counted against the curriculum.`)
}

const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const keyed = existsSync(`corpus/${locale}/meanings.json`)
  ? readMeanings(readFileSync(`corpus/${locale}/meanings.json`, 'utf8'))
  : {}

const xml = await fetched(JMDICT, 'JMdict')
const said = parseWords(xml, locale)

const words = subjects.filter(
  (one) => (one.type === 'vocabulary' || one.type === 'kana_vocabulary') && one.characters !== null && !one.hidden,
)

// A word written with one kanji and meaning what that kanji means is taught by the word the character
// already carries, or the same shape teaches two French words on two cards. Where the two disagree the
// word keeps its own: 天 the character is heaven and 天 the word is the heavens, and a card teaching
// the first for the second teaches the wrong one.
const english = new Map(
  subjects.filter((one) => one.type === 'kanji' && one.characters !== null).map((one) => [one.characters, one.meanings]),
)
const reuses = (word: { characters: string | null; meanings: readonly string[] }): boolean => {
  const character = english.get(word.characters ?? '')
  if (character === undefined) return false

  const said = new Set(word.meanings.map((one) => one.toLowerCase()))

  return character.some((one) => said.has(one.toLowerCase()))
}

const meanings: Record<string, readonly string[]> = {}
const owed: string[] = []
let carried = 0

for (const word of words) {
  const form = word.characters as string
  const stated = said.get(form)

  if (reuses(word) && keyed[form] !== undefined) {
    meanings[form] = keyed[form]
    carried += 1
    continue
  }
  if (stated === undefined || stated.length === 0) {
    owed.push(form)
    continue
  }

  meanings[form] = stated
}

writeFileSync(output, meaningsFile({ header: headerFor(releaseOf(xml)), meanings }))

process.stdout.write(`vocabulary: ${Object.keys(meanings).length} of ${words.length} written to ${output}\n`)
process.stdout.write(`taught by the character they write: ${carried}\n`)
process.stdout.write(`words the release does not gloss in ${locale}, owed to a later run: ${list(owed)}\n`)

// What the release says it is. The address is one rolling file, so a run recording the URL would record
// nothing: two runs six months apart read different data under the same name.
function releaseOf(release: string): string {
  return /<!-- JMdict created: (.*?) -->/.exec(release)?.[1] ?? 'unstated'
}

function headerFor(release: string): Readonly<Record<string, string>> {
  return {
    source: `JMdict ${release}`,
    licence: 'CC BY-SA 4.0, Electronic Dictionary Research and Development Group',
    holds: 'what each word of the curriculum means here, the shown meaning first and the rest behind it',
  }
}
