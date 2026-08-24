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

import { toRomaji } from 'wanakana'

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

// A word whose every meaning is its own reading romanised is a name: the course teaches 瑛斗 as Eito
// because that is what it is called, not because 瑛 and 斗 say so. A name is the same word here, so it
// is derived from the reading rather than translated, and rather than copied from the course. Read only
// where the dictionary states nothing, since a borrowed word passes this test too and the release is
// what knows that French writes it samouraï.
const nameOf = (word: { characters: string | null; meanings: readonly string[]; readings: readonly { value: string }[] }) => {
  const romanised = word.readings.map((one) => {
    const said = toRomaji(one.value)

    return said.charAt(0).toUpperCase() + said.slice(1)
  })
  const named = word.meanings.length > 0 && word.meanings.every((one) => romanised.some((said) => said.toLowerCase() === one.toLowerCase()))

  return named ? romanised : null
}

// The meaning the card shows leads. The release orders its senses its own way, so 味噌 states the
// figurative sense before the paste, and a card showing the first would ask for a word nobody is
// taught. Where one of them is what the course teaches, that one leads and the rest follow it.
const shown = (stated: readonly string[], taught: readonly string[]): readonly string[] => {
  const asked = new Set(taught.map(flattened))
  const first = stated.findIndex((one) => asked.has(flattened(one)))

  return first < 1 ? stated : [stated[first] as string, ...stated.filter((_, at) => at !== first)]
}

// Compared without case or accent, since the course writes its meanings in English and a word carried
// into French unchanged is written with the accent French gives it: karate and karaté are one word.
function flattened(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
}

const meanings: Record<string, readonly string[]> = {}
const owed: string[] = []
let carried = 0
let named = 0

for (const word of words) {
  const form = word.characters as string
  const stated = said.get(form)
  if (reuses(word) && keyed[form] !== undefined) {
    meanings[form] = keyed[form]
    carried += 1
    continue
  }
  if (stated !== undefined && stated.length > 0) {
    meanings[form] = shown(stated, word.meanings)
    continue
  }

  // Last, and only where the dictionary states nothing: a word French has borrowed is written the way
  // French writes it, 侍 being samouraï rather than Samurai, and the release is what knows that. What
  // is left after it are the names nothing glosses.
  const name = nameOf(word)

  if (name === null) owed.push(form)
  else {
    meanings[form] = name
    named += 1
  }
}

// A meaning already written that this run cannot produce is kept rather than dropped. corpus:word pays
// a model for exactly those, and a re-run that reset the file would throw away what was paid for and
// ask for it again. What the dictionary does state is written afresh, the release being the truth.
const held = existsSync(output)
  ? Object.entries(readMeanings(readFileSync(output, 'utf8'))).filter(([word]) => meanings[word] === undefined)
  : []

writeFileSync(
  output,
  meaningsFile({ header: headerFor(releaseOf(xml)), meanings: { ...Object.fromEntries(held), ...meanings } }),
)

process.stdout.write(`vocabulary: ${Object.keys(meanings).length + held.length} of ${words.length} written to ${output}, ${held.length} of them held from an earlier run\n`)
process.stdout.write(`taught by the character they write: ${carried}, named by their own reading: ${named}\n`)
process.stdout.write(`words the release does not gloss in ${locale}: ${list(owed.filter((one) => meanings[one] === undefined && !held.some(([word]) => word === one)))}\n`)

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
