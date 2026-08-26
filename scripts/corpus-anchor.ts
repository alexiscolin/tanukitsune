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
import { allocate } from '../src/core/corpus/choose.ts'
import { distanceBetween } from '../src/core/corpus/anchor.ts'
import { candidatesBy, soundsOf, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { readKeyOrder, readLexicon, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'
import { phonemesOf } from '../src/core/corpus/phonetics.ts'

// An anchor is one word standing for one reading, and no word carries more than this. No reading a
// kanji teaches runs past four morae, so the ceiling touches words alone.
const MOST_MORAE = 4

// A word nobody has ever met is a cue to be learned before it can help, so the pool is held to what a
// reader is likely to know, and to nouns, a story being built on things that can be pictured.
const AT_LEAST = 1

const locale = process.argv[2] ?? 'fr'
const READINGS = 'corpus/.readings.json'
const WRITTEN = 'anchor-written.json'
const at = (file: string) => `corpus/${locale}/${file}`

for (const needed of [READINGS, at('.lexicon.json'), at('phonology.json')]) {
  if (!existsSync(needed)) throw new Error(`No anchors can be chosen without ${needed}. Run pnpm corpus to write it`)
}

const readings = readReadings(readFileSync(READINGS, 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const { nearest, apart, unrated, hears, writes, refuses } = readPhonology(readFileSync(at('phonology.json'), 'utf8'))

// The words written for the readings the lexicon left without one, read before the table runs rather
// than instead of it: a reading reaches that file only once the table has been asked and has failed.
// Their sounds are derived here like any other anchor's, word by word out of the lexicon, a phrase
// being the one thing the table cannot search and its pronunciation still never taken on trust.
const carried: ReadonlyMap<string, readonly string[]> = existsSync(at(WRITTEN))
  ? readKeyOrder(readFileSync(at(WRITTEN), 'utf8'))
  : new Map()
const proposed: Allocated[] = []

for (const [reading, words] of carried) {
  const phrase = words[0]
  const sounds = phrase === undefined ? null : soundsOf(phrase, lexicon)
  if (phrase === undefined || sounds === null) continue

  proposed.push({ reading, anchor: phrase, phonemes: sounds })
}

const settled = new Set(proposed.map((one) => one.reading))
const wanted = wantedFrom(readings, MOST_MORAE, hears).filter((one) => !settled.has(one.value))
// What a card will not carry, whatever it sounds like: neither the frequency floor nor the distance
// catches a word that is ordinary, common and unusable in front of a reader.
const carries = (text: string) => !refuses.has(text)
const offered = candidatesBy(lexicon, (word, text) => word.category === 'NOM' && word.frequency >= AT_LEAST && carries(text))
const limits = { nearest, apart, unrated }

// The readings a character teaches are served before the readings a word teaches. Serving them
// together orders by scarcity alone, and a word's reading is scarcer than a character's while being
// worth less: a character's reading is taught once and reused by every word built on it, so a cue
// spent on one word leaves every one of those cards without it. Of the 557 readings a character
// teaches, one order binds 384 and the other 253.
const spentAlready = new Set(proposed.flatMap((one) => one.anchor.split(/\s+/)))

const remember = (one: Allocated) => {
  for (const word of one.anchor.split(/\s+/)) spentAlready.add(word)
}

for (const one of proposed) remember(one)

const free = (word: { text: string }) => !spentAlready.has(word.text)
const characters = wanted.filter((one) => readings.get(one.value)?.type !== null)
const first = allocate(characters, (reading) => offered(reading).filter(free), limits)
for (const one of first.allocated) remember(one)

const left = wanted.filter((one) => readings.get(one.value)?.type === null)
const second = allocate(left, (reading) => offered(reading).filter(free), limits)
for (const one of second.allocated) remember(one)

// What the first two passes leave is asked again of the same nouns without the floor. A rare word is a
// weak cue and a reading with no anchor is a card that cannot be written at all, so the trade is taken
// and said rather than taken quietly: each anchor carries how common its word is, and 344 of them come
// from this pass. Widening to every part of speech as well buys 37 more and spends the rule that a
// story is built on things that can be pictured, so it is not done.
const short = [...first.unserved, ...second.unserved]
  .map((one) => wanted.find((asked) => asked.value === one.reading))
  .filter((one) => one !== undefined)

const rare = candidatesBy(lexicon, (word, text) => word.category === 'NOM' && carries(text))
const third = allocate(short, (reading) => rare(reading).filter(free), limits)
for (const one of third.allocated) remember(one)

// A sound the locale writes without saying it. The reading is compared from the sound that follows,
// and the anchor has to be spelled with the letter: la hache is said without an h and carries one where
// the reader looks, and a mnemonic is read. Held to its own pass so these readings never take a word a
// reading beginning on the bare vowel needs, the two being one sound apart and told apart in writing.
const written = [...third.unserved]
const bound: Allocated[] = []

for (const [sound, letter] of writes) {
  const owed = new Map(
    [...readings].filter(([value, named]) => named.taught && phonemesOf(value)[0] === sound),
  )
  const asked = wantedFrom(owed, MOST_MORAE, new Map([[sound, '']]))
  const spelled = candidatesBy(lexicon, (word, text) => word.category === 'NOM' && text.startsWith(letter) && carries(text))
  const pass = allocate(asked, (reading) => spelled(reading).filter(free), limits)

  for (const one of pass.allocated) remember(one)
  bound.push(...pass.allocated)
  for (const one of pass.unserved) written.push(one)
}

// `allocate` holds two anchors apart inside one call and knows nothing of the calls before it, so a
// pass reading only the words already taken lets its own anchors land a hair from an earlier pass's:
// one cue with two answers, which is what the separation exists to prevent. Swept once over the whole
// set instead of asked of every candidate, which is the same answer for a thousandth of the reads.
//
// The earlier pass keeps its anchor. A reading served by the character pass is a reading the ordering
// already said was worth serving first, and taking its word back for a later one reverses that.
const kept: Allocated[] = []
const crowded: { reading: string; reason: 'none free' }[] = []

for (const one of [...proposed, ...first.allocated, ...second.allocated, ...third.allocated, ...bound]) {
  if (kept.some((other) => distanceBetween(other.phonemes, one.phonemes) < apart)) {
    crowded.push({ reading: one.reading, reason: 'none free' })
    continue
  }

  kept.push(one)
}

// The readings the sweep took a word from are asked again, of the words still far enough from
// everything kept. Left there, 330 readings lose an anchor to a rule meant only to keep two apart,
// while the lexicon still holds a word that keeps them apart and serves them both.
//
// The pool is filtered once rather than per reading, which is the same answer for a three hundredth of
// the reads, and held by how many sounds a word has: two anchors nearer than a tenth differ by less
// than a tenth of the longer one, so a word a sound longer than another is rarely too near it. What
// slips through is caught by the sweep above on the next run rather than by this.
const byLength = new Map<number, Allocated[]>()
for (const one of kept) byLength.set(one.phonemes.length, [...(byLength.get(one.phonemes.length) ?? []), one])

const roomy = new Set<string>()
for (const [text, word] of lexicon) {
  if (word.category !== 'NOM' || !carries(text) || spentAlready.has(text)) continue

  const near = [word.phonemes.length - 1, word.phonemes.length, word.phonemes.length + 1].some((length) =>
    (byLength.get(length) ?? []).some((one) => distanceBetween(one.phonemes, word.phonemes) < apart),
  )
  if (!near) roomy.add(text)
}

const evicted = crowded
  .map((one) => wanted.find((asked) => asked.value === one.reading))
  .filter((one) => one !== undefined)
const spare = candidatesBy(lexicon, (word, text) => word.category === 'NOM' && carries(text) && roomy.has(text))
const again = allocate(evicted, spare, limits)

for (const one of again.allocated) {
  // Swept like the rest, since the pool was filtered against the set as it stood and two of these can
  // still land near each other.
  if (kept.some((other) => distanceBetween(other.phonemes, one.phonemes) < apart)) continue

  remember(one)
  kept.push(one)
}

const allocated = kept
// One line per reading still owed. A reading refused by two passes is owed once, and one this last pass
// served is no longer owed whatever the passes before it said of it.
const decided = new Set(allocated.map((one) => one.reading))
const owed = new Map(
  [...written, ...crowded, ...again.unserved].filter((one) => !decided.has(one.reading)).map((one) => [one.reading, one]),
)
const unserved = [...owed.values()]

const HEADER = {
  source: 'Chosen by pnpm corpus:anchor from Lexique and the readings the curriculum teaches',
  written: 'The words are French and the pairing is this corpus own. Neither is taken from any release.',
  modified: `A reading of at most ${MOST_MORAE} morae is bound to one noun, no nearer than ${apart} to another anchor and no further than ${nearest} from its reading. The readings a character teaches are served first, the readings a word teaches next, and what neither pass could serve is asked again of the words under ${AT_LEAST} occurrence per million.`,
  spelled: 'A reading beginning on a sound this locale writes without saying it is compared from the sound that follows, and its anchor is spelled with that letter.',
  shape: 'reading to the word standing for it, that word phonemes as the lexicon derives them, and how common its rarest word is per million',
  left: `The readings still owed a word, with why. pnpm corpus:anchor-written asks for those, and writes them to ${WRITTEN}, which this reads on its next run.`,
}

// How common the anchor is travels with it, so a check can hold the set to a floor without the lexicon,
// which stays on the machine that generated it. A phrase is as common as its rarest word.
const common = (anchor: string) =>
  Math.min(...anchor.split(/\s+/).map((word) => lexicon.get(word)?.frequency ?? 0))

const lines = allocated
  .map((one) => `${JSON.stringify(one.reading)}:${JSON.stringify([one.anchor, one.phonemes, common(one.anchor)])}`)
  .join(',\n')

// Written beside the anchors rather than printed alone, since the run that asks for the words owed
// reads this file and nothing else: a list only a terminal saw is a list the next command cannot act on.
const owing = unserved.map((one) => `${JSON.stringify(one.reading)}:${JSON.stringify(one.reason)}`).join(',\n')

writeFileSync(
  at('anchors.json'),
  `{\n"header":${JSON.stringify(HEADER)},\n"anchors":{\n${lines}\n},\n"left":{\n${owing}\n}\n}\n`,
)

const weak = allocated.filter((one) => common(one.anchor) < AT_LEAST).length
process.stdout.write(
  `anchors: ${allocated.length} of ${wanted.length} readings bound, written to ${at('anchors.json')}, ${weak} of them on a word under ${AT_LEAST} occurrence per million\n`,
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
