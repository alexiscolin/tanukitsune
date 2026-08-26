// Binds every reading a card teaches to one French word, written to corpus/<locale>/anchors.json.
//
// Run with `pnpm corpus:anchor [locale]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It reaches no model: which word stands for which reading is a
// calculation over data, which is why it runs over all sixty levels at once while only the levels
// being shipped are written. An anchor spent at level 3 is an anchor missing at level 40, and taking
// one back means rewriting every mnemonic that used it.
//
// The rules are in src/core/corpus: `anchor.ts` says whether a word can stand for a reading, and
// `choose.ts` says which of the words that can, does. What is French about it is in phonology.json.
//
// A reading left without an anchor leaves its reason here rather than being quietly skipped, since a
// card that cannot be written is the reader's to rule on.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { allocate } from '../src/core/corpus/choose.ts'
import { candidatesBy, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { readLexicon, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'

// An anchor is one word standing for one reading, and no word carries more than this. No reading a
// kanji teaches runs past four morae, so the ceiling touches words alone.
const MOST_MORAE = 4

// A word nobody has ever met is a cue to be learned before it can help, so the pool is held to what a
// reader is likely to know, and to nouns, a story being built on things that can be pictured.
const AT_LEAST = 1

const locale = process.argv[2] ?? 'fr'
const READINGS = 'corpus/.readings.json'
const at = (file: string) => `corpus/${locale}/${file}`

for (const needed of [READINGS, at('.lexicon.json'), at('phonology.json')]) {
  if (!existsSync(needed)) throw new Error(`No anchors can be chosen without ${needed}. Run pnpm corpus to write it`)
}

const readings = readReadings(readFileSync(READINGS, 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const { nearest, apart, unrated } = readPhonology(readFileSync(at('phonology.json'), 'utf8'))

const wanted = wantedFrom(readings, MOST_MORAE)
const offered = candidatesBy(lexicon, (word) => word.category === 'NOM' && word.frequency >= AT_LEAST)
const limits = { nearest, apart, unrated }

// The readings a character teaches are served before the readings a word teaches. Serving them
// together orders by scarcity alone, and a word's reading is scarcer than a character's while being
// worth less: a character's reading is taught once and reused by every word built on it, so a cue
// spent on one word leaves every one of those cards without it. Of the 557 readings a character
// teaches, one order binds 384 and the other 253.
const characters = wanted.filter((one) => readings.get(one.value)?.type !== null)
const first = allocate(characters, offered, limits)

const taken = new Set(first.allocated.map((one) => one.anchor))
const left = wanted.filter((one) => readings.get(one.value)?.type === null)
const second = allocate(left, (reading) => offered(reading).filter((word) => !taken.has(word.text)), limits)

const allocated = [...first.allocated, ...second.allocated]
const unserved = [...first.unserved, ...second.unserved]

const HEADER = {
  source: 'Chosen by pnpm corpus:anchor from Lexique and the readings the curriculum teaches',
  written: 'The words are French and the pairing is this corpus own. Neither is taken from any release.',
  modified: `A reading of at most ${MOST_MORAE} morae is bound to one noun of at least ${AT_LEAST} occurrence per million, no nearer than ${apart} to another anchor and no further than ${nearest} from its reading. The readings a character teaches are served before the readings a word teaches.`,
  shape: 'reading to the word standing for it and that word phonemes, derived from the lexicon',
}

const lines = allocated
  .map((one) => `${JSON.stringify(one.reading)}:${JSON.stringify([one.anchor, one.phonemes])}`)
  .join(',\n')

writeFileSync(at('anchors.json'), `{\n"header":${JSON.stringify(HEADER)},\n"anchors":{\n${lines}\n}\n}\n`)

process.stdout.write(`anchors: ${allocated.length} of ${wanted.length} readings bound, written to ${at('anchors.json')}\n`)

// The two reasons are apart because they ask for different things. No acceptable word means the pool
// is too narrow for this reading and no reordering will serve it; none free means the words exist and
// the curriculum has spent them, which widening the pool does fix.
const narrow = unserved.filter((one) => one.reason === 'none acceptable')
if (unserved.length > 0) {
  process.stdout.write(
    `readings left without one: ${unserved.length}, ${narrow.length} with no word the rules accept and ${unserved.length - narrow.length} whose words are already anchors\n`,
  )
}
