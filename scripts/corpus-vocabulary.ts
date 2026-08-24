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

import { fetched, list, taughtWords } from './corpus-command.ts'
import { faultInMeaning } from '../src/core/corpus/name.ts'
import { nameOf, reusesItsCharacter, shownFirst } from '../src/data/corpus/vocabulary.ts'
import { meaningsFile, readMeanings, readNaming } from '../src/data/corpus/artifact.ts'
import { parseWords, releaseOf } from '../src/data/corpus/jmdict.ts'
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
const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const keyed = existsSync(`corpus/${locale}/meanings.json`)
  ? readMeanings(readFileSync(`corpus/${locale}/meanings.json`, 'utf8'))
  : {}

// Read straight into what is kept rather than through a binding: the release is 112 MB and would
// otherwise stay reachable through the whole run, for a value nothing reads after these two lines.
const { said, release } = ((xml: string) => ({ said: parseWords(xml, locale), release: releaseOf(xml) }))(
  await fetched(JMDICT, 'JMdict'),
)

const words = taughtWords(subjects)

// What the course teaches each character as, which is what says whether a word written with one means
// the same thing as it.
const english = new Map(
  subjects.filter((one) => one.type === 'kanji' && one.characters !== null).map((one) => [one.characters as string, one.meanings]),
)

const meanings: Record<string, readonly string[]> = {}
const owed: string[] = []
let carried = 0
let named = 0

for (const word of words) {
  const form = word.characters as string
  const stated = said.get(form)

  if (reusesItsCharacter(word.meanings, english.get(form)) && keyed[form] !== undefined) {
    meanings[form] = keyed[form]
    carried += 1
    continue
  }
  // The same rule the gate holds the file to, applied where the file is written rather than found
  // afterwards: a release states a gloss quoted, or with a degree sign, or with an aside marked by an
  // arrow, and none of those is a word a reader types.
  const usable = stated?.filter((one) => faultInMeaning(one, naming) === null) ?? []

  if (usable.length > 0) {
    meanings[form] = shownFirst(usable, word.meanings)
    continue
  }

  // Last, and only where the dictionary states nothing: a word French has borrowed is written the way
  // French writes it, 侍 being samouraï rather than Samurai, and the release is what knows that. What
  // is left after it are the names nothing glosses.
  const name = nameOf(word.meanings, word.readings.map((one) => one.value))

  if (name === null) owed.push(form)
  else {
    meanings[form] = name
    named += 1
  }
}

// A meaning already written that this run cannot produce is kept rather than dropped. corpus:word pays
// a model for exactly those, and a re-run that reset the file would throw away what was paid for and
// ask for it again. What the dictionary does state is written afresh, the release being the truth.
const written: Record<string, readonly string[]> = {}
let held = 0

if (existsSync(output)) {
  for (const [word, said] of Object.entries(readMeanings(readFileSync(output, 'utf8')))) {
    if (meanings[word] !== undefined) continue

    written[word] = said
    held += 1
  }
}

writeFileSync(output, meaningsFile({ header: headerFor(release), meanings: { ...written, ...meanings } }))

process.stdout.write(`vocabulary: ${Object.keys(meanings).length + held} of ${words.length} written to ${output}, ${held} of them held from an earlier run\n`)
process.stdout.write(`taught by the character they write: ${carried}, named by their own reading: ${named}\n`)
process.stdout.write(`words the release does not gloss in ${locale}: ${list(owed.filter((one) => written[one] === undefined))}\n`)

function headerFor(release: string): Readonly<Record<string, string>> {
  return {
    source: `JMdict ${release}`,
    licence: 'CC BY-SA 4.0, Electronic Dictionary Research and Development Group',
    modified:
      'Only the words the curriculum deals are kept, only the glosses of one language, an aside in parentheses is dropped, a gloss this language cannot write is left out, and the meaning the course teaches leads.',
    holds: 'what each word of the curriculum means here, the shown meaning first and the rest behind it',
  }
}
