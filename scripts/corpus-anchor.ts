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

import type { Allocated } from '../src/core/corpus/allocation.ts'
import type { Candidate, Wanted } from '../src/core/corpus/choose.ts'
import { allocate } from '../src/core/corpus/choose.ts'
import { candidatesBy, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { readLexicon, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'
import { phonemesOf } from '../src/core/corpus/phonetics.ts'

const locale = process.argv[2] ?? 'fr'
const READINGS = 'corpus/.readings.json'
const at = (file: string) => `corpus/${locale}/${file}`

for (const needed of [READINGS, at('.lexicon.json'), at('phonology.json')]) {
  if (!existsSync(needed)) throw new Error(`No anchors can be chosen without ${needed}. Run pnpm corpus to write it`)
}

const readings = readReadings(readFileSync(READINGS, 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const { nearest, apart, unrated, atMostMorae, atLeastCommon, partsOfSpeech, hears, writes } = readPhonology(
  readFileSync(at('phonology.json'), 'utf8'),
)

const wanted = wantedFrom(readings, atMostMorae, hears)
const keeps = (word: { category: string }) => partsOfSpeech.includes(word.category)
const offered = candidatesBy(lexicon, (word) => keeps(word) && word.frequency >= atLeastCommon)
const limits = { nearest, apart, unrated }

// The readings a character teaches are served before the readings a word teaches. Serving them
// together orders by scarcity alone, and a word's reading is scarcer than a character's while being
// worth less: a character's reading is taught once and reused by every word built on it, so a cue
// spent on one word leaves every one of those cards without it. Of the 557 readings a character
// teaches, one order binds 384 and the other 253.
const characters = wanted.filter((one) => readings.get(one.value)?.type !== null)
const first = allocate(characters, offered, limits)

// Filtered once per sound rather than once per reading. The set of words a pass has spent does not
// move inside that pass, so every reading beginning on the same sound was refiltering the same bucket
// against the same answer.
const taken = new Set(first.allocated.map((one) => one.anchor))
const left = wanted.filter((one) => readings.get(one.value)?.type === null)
const second = allocate(left, without(offered, taken), limits)

// What the first two passes leave is asked again of the same nouns without the floor. A rare word is a
// weak cue and a reading with no anchor is a card that cannot be written at all, so the trade is taken
// and said rather than taken quietly: each anchor carries how common its word is, and 344 of them come
// from this pass. Widening to every part of speech as well buys 37 more and spends the rule that a
// story is built on things that can be pictured, so it is not done.
const held = new Set([...taken, ...second.allocated.map((one) => one.anchor)])
const short = [...first.unserved, ...second.unserved]
  .map((one) => wanted.find((asked) => asked.value === one.reading))
  .filter((one) => one !== undefined)

const rare = candidatesBy(lexicon, keeps)
const third = allocate(short, without(rare, held), limits)

// A sound the locale writes without saying it. The reading is compared from the sound that follows,
// and the anchor has to be spelled with the letter: la hache is said without an h and carries one where
// the reader looks, and a mnemonic is read. Held to its own pass so these readings never take a word a
// reading beginning on the bare vowel needs, the two being one sound apart and told apart in writing.
const spoken = new Set([...held, ...third.allocated.map((one) => one.anchor)])
const written = [...third.unserved]
const bound: Allocated[] = []

for (const [sound, letter] of writes) {
  const owed = new Map(
    [...readings].filter(([value, named]) => named.taught && phonemesOf(value)[0] === sound),
  )
  const asked = wantedFrom(owed, atMostMorae, new Map([[sound, '']]))
  const spelled = candidatesBy(lexicon, (word, text) => word.category === 'NOM' && text.startsWith(letter))
  const pass = allocate(asked, (reading) => spelled(reading).filter((word) => !spoken.has(word.text)), limits)

  for (const one of pass.allocated) spoken.add(one.anchor)
  bound.push(...pass.allocated)
  for (const one of pass.unserved) written.push(one)
}

const allocated = [...first.allocated, ...second.allocated, ...third.allocated, ...bound]
// One line per reading still owed. A reading refused by two passes is owed once, and one this last pass
// served is no longer owed whatever the passes before it said of it.
const decided = new Set(allocated.map((one) => one.reading))
const owed = new Map(written.filter((one) => !decided.has(one.reading)).map((one) => [one.reading, one]))
const unserved = [...owed.values()]

// A pool with the words a pass has already spent taken out, held by the sound a reading begins on so
// the answer is found once and read by every reading that begins on it.
function without(pool: (reading: Wanted) => readonly Candidate[], spent: ReadonlySet<string>) {
  const held = new Map<string, readonly Candidate[]>()

  return (reading: Wanted): readonly Candidate[] => {
    const [onset = ''] = reading.phonemes
    const already = held.get(onset)
    if (already !== undefined) return already

    const free = pool(reading).filter((word) => !spent.has(word.text))
    held.set(onset, free)

    return free
  }
}

const HEADER = {
  source: 'Chosen by pnpm corpus:anchor from Lexique and the readings the curriculum teaches',
  written: 'The words are French and the pairing is this corpus own. Neither is taken from any release.',
  modified: `A reading of at most ${atMostMorae} morae is bound to one noun, no nearer than ${apart} to another anchor and no further than ${nearest} from its reading. The readings a character teaches are served first, the readings a word teaches next, and what neither pass could serve is asked again of every noun, the floor of ${atLeastCommon} occurrence per million lifted.`,
  spelled: 'A reading beginning on a sound this locale writes without saying it is compared from the sound that follows, and its anchor is spelled with that letter.',
  shape: 'reading to the word standing for it, that word phonemes as the lexicon derives them, and how common it is per million',
}

// How common the anchor is travels with it, so a check can hold the set to a floor without the lexicon,
// which stays on the machine that generated.
const lines = allocated
  .map((one) => `${JSON.stringify(one.reading)}:${JSON.stringify([one.anchor, one.phonemes, lexicon.get(one.anchor)?.frequency ?? 0])}`)
  .join(',\n')

writeFileSync(at('anchors.json'), `{\n"header":${JSON.stringify(HEADER)},\n"anchors":{\n${lines}\n}\n}\n`)

const weak = allocated.filter((one) => (lexicon.get(one.anchor)?.frequency ?? 0) < atLeastCommon).length
process.stdout.write(
  `anchors: ${allocated.length} of ${wanted.length} readings bound, written to ${at('anchors.json')}, ${weak} of them on a word under ${atLeastCommon} occurrence per million\n`,
)

// The two reasons are apart because they ask for different things. No acceptable word means the pool
// is too narrow for this reading and no reordering will serve it; none free means the words exist and
// the curriculum has spent them, which widening the pool does fix.
const narrow = unserved.filter((one) => one.reason === 'none acceptable')
if (unserved.length > 0) {
  process.stdout.write(
    `readings left without one: ${unserved.length}, ${narrow.length} with no word the rules accept and ${unserved.length - narrow.length} whose words are already anchors\n`,
  )
}
