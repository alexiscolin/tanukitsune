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
import { heldApart } from '../src/core/corpus/allocation.ts'
import type { Candidate, Wanted } from '../src/core/corpus/choose.ts'
import { allocate } from '../src/core/corpus/choose.ts'
import { candidatesBy, roomyWords, soundsOf, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { readKeyOrder, readLexicon, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'
import { phonemesOf } from '../src/core/corpus/phonetics.ts'

const locale = process.argv[2] ?? 'fr'
const READINGS = 'corpus/.readings.json'
const WRITTEN = 'anchor-written.json'
const at = (file: string) => `corpus/${locale}/${file}`

for (const needed of [READINGS, at('.lexicon.json'), at('phonology.json')]) {
  if (!existsSync(needed)) throw new Error(`No anchors can be chosen without ${needed}. Run pnpm corpus to write it`)
}

const readings = readReadings(readFileSync(READINGS, 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const { nearest, apart, unrated, hears, writes, refuses, atMostMorae, atLeastCommon, partsOfSpeech } = readPhonology(
  readFileSync(at('phonology.json'), 'utf8'),
)

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
// Every reading owed an anchor, before the ones a proposal already answered are taken out of the
// table's work: what a run reports is out of the whole rather than out of what it had left to do.
const asked = wantedFrom(readings, atMostMorae, hears)
const wanted = asked.filter((one) => !settled.has(one.value))
// What a card will not carry, whatever it sounds like: neither the frequency floor nor the distance
// catches a word that is ordinary, common and unusable in front of a reader.
const carries = (text: string) => !refuses.has(text)
const keeps = (word: { category: string }) => partsOfSpeech.includes(word.category)
const offered = candidatesBy(lexicon, (word, text) => keeps(word) && word.frequency >= atLeastCommon && carries(text))
const limits = { nearest, apart, unrated }

// The readings a character teaches are served before the readings a word teaches. Serving them
// together orders by scarcity alone, and a word's reading is scarcer than a character's while being
// worth less: a character's reading is taught once and reused by every word built on it, so a cue
// spent on one word leaves every one of those cards without it. Of the 557 readings a character
// teaches, one order binds 384 and the other 253.
// An anchor is the thing the reader meets, so a phrase is spent whole and the words inside it are not:
// haut nid is not nid, and what keeps two anchors from being one cue is the separation swept below.
const spentAlready = new Set(proposed.map((one) => one.anchor))

const remember = (one: Allocated) => {
  spentAlready.add(one.anchor)
}

for (const one of proposed) remember(one)

const free = (word: { text: string }) => !spentAlready.has(word.text)
const characters = wanted.filter((one) => readings.get(one.value)?.type !== null)
const first = allocate(characters, without(offered, free), limits)
for (const one of first.allocated) remember(one)

const left = wanted.filter((one) => readings.get(one.value)?.type === null)
const second = allocate(left, without(offered, free), limits)
for (const one of second.allocated) remember(one)

// What the first two passes leave is asked again of the same nouns without the floor. A rare word is a
// weak cue and a reading with no anchor is a card that cannot be written at all, so the trade is taken
// and said rather than taken quietly: each anchor carries how common its word is, and 344 of them come
// from this pass. Widening to every part of speech as well buys 37 more and spends the rule that a
// story is built on things that can be pictured, so it is not done.
const short = [...first.unserved, ...second.unserved]
  .map((one) => wanted.find((asked) => asked.value === one.reading))
  .filter((one) => one !== undefined)

const rare = candidatesBy(lexicon, (word, text) => keeps(word) && carries(text))
const third = allocate(short, without(rare, free), limits)
for (const one of third.allocated) remember(one)

// A sound the locale writes without saying it. The reading is compared from the sound that follows,
// and the anchor has to be spelled with the letter: la hache is said without an h and carries one where
// the reader looks, and a mnemonic is read. Held to its own pass so these readings never take a word a
// reading beginning on the bare vowel needs, the two being one sound apart and told apart in writing.
const written = [...third.unserved]
const bound: Allocated[] = []
// What each written pass heard a reading as, and the letter it held its anchor to, so the recovery
// below asks again on the same terms rather than on the ones the table's own list carries.
const spelledAs = new Map<string, Wanted>()
const spelledWith = new Map<string, string>()

for (const [sound, letter] of writes) {
  // Settled readings are skipped here as they are in `wanted`. Left in, this pass binds a reading a
  // proposal already answered, and the later of the two wins by being written later rather than better.
  const owed = new Map(
    [...readings].filter(([value, named]) => named.taught && !settled.has(value) && phonemesOf(value)[0] === sound),
  )
  // The whole table with this sound dropped, not the drop alone: replaced, an h-initial reading is
  // compared on raw Japanese sounds from its second phoneme on and pays every penalty the table removes.
  const owedHere = wantedFrom(owed, atMostMorae, new Map([...hears, [sound, '']]))
  const spelled = candidatesBy(
    lexicon,
    (word, text) => keeps(word) && word.frequency >= atLeastCommon && text.startsWith(letter) && carries(text),
  )
  const pass = allocate(owedHere, without(spelled, free), limits)

  for (const one of owedHere) {
    spelledAs.set(one.value, one)
    spelledWith.set(one.value, letter)
  }

  for (const one of pass.allocated) remember(one)
  bound.push(...pass.allocated)
  for (const one of pass.unserved) written.push(one)
}

// `allocate` holds two anchors apart inside one call and knows nothing of the calls before it, so the
// set the passes built is held apart once over the whole of it. What that crowds out is asked again, of
// the words still far enough from everything kept: left there, a reading loses an anchor to a rule
// meant only to keep two apart while the lexicon still holds a word that keeps them apart and serves
// them both.
const built = [...proposed, ...first.allocated, ...second.allocated, ...third.allocated, ...bound]
const heardAnchor = new Map(built.map((one) => [one.reading, one.anchor] as const))

const { kept, crowded } = heldApart(
  built,
  apart,
)

// Every reading the sweep took a word from, the ones a proposal answered included: those are the half
// somebody paid for, and looking a crowded reading up in the table's own work alone leaves them out.
// Every reading the sweep took a word from, the ones a proposal answered included: those are the half
// somebody paid for. Each is asked again on the sounds the pass that served it used, not on the ones
// the table's own list carries: a reading the written pass served has its first sound dropped, and
// looked up undropped it is handed a pool no French word can be in.
const heard = new Map([...asked.map((one) => [one.value, one] as const), ...spelledAs])
const evicted = crowded.map((reading) => heard.get(reading)).filter((one) => one !== undefined)
// A word the sweep freed is free again: kept in `spentAlready`, the recovery is refused the very words
// the eviction released and reserved for nobody.
for (const one of crowded) for (const word of (heardAnchor.get(one) ?? '').split(/\s+/)) spentAlready.delete(word)

const roomy = roomyWords(lexicon, kept, apart, (word, text) => keeps(word) && carries(text) && !spentAlready.has(text))
// The letter a written sound needs travels with the reading, as it does in the pass that owns it: a
// locale whose unsaid sound its own lexicon carries would otherwise be given an anchor missing it.
const spare = (reading: Wanted) =>
  candidatesBy(lexicon, (word, text) => {
    const letter = spelledWith.get(reading.value)

    return keeps(word) && roomy.has(text) && (letter === undefined || text.startsWith(letter))
  })(reading)
const again = allocate(evicted, spare, limits)

// Swept like the rest, the pool having been filtered against the set as it stood and two of these
// still being able to land near each other.
const { kept: settledSet } = heldApart([...kept, ...again.allocated], apart)

const allocated = settledSet
// One line per reading still owed. A reading refused by two passes is owed once, and one this last pass
// served is no longer owed whatever the passes before it said of it.
const decided = new Set(allocated.map((one) => one.reading))
// A reading the sweep crowded out and the recovery could not serve is owed one because its word was
// taken, which is the reason `allocate` names when the words exist and the curriculum has spent them.
const owed = new Map(
  [...written, ...again.unserved, ...crowded.map((reading) => ({ reading, reason: 'none free' as const }))]
    .filter((one) => !decided.has(one.reading))
    .map((one) => [one.reading, one] as const),
)
const unserved = [...owed.values()]

// A pool with the words a pass has already spent taken out, held by the sound a reading begins on so
// the answer is found once and read by every reading that begins on it. `allocate` asks once per
// reading, and dozens of them share one onset, so the same bucket is otherwise filtered dozens of times
// against the same answer.
function without(pool: (reading: Wanted) => readonly Candidate[], free: (word: Candidate) => boolean) {
  const held = new Map<string, readonly Candidate[]>()

  return (reading: Wanted): readonly Candidate[] => {
    const [onset = ''] = reading.phonemes
    const already = held.get(onset)
    if (already !== undefined) return already

    const left = pool(reading).filter(free)
    held.set(onset, left)

    return left
  }
}

const HEADER = {
  source: 'Chosen by pnpm corpus:anchor from Lexique and the readings the curriculum teaches',
  written: 'The words are French and the pairing is this corpus own. Neither is taken from any release.',
  modified: `A reading of at most ${atMostMorae} morae is bound to one noun, no nearer than ${apart} to another anchor and no further than ${nearest} from its reading. The readings a character teaches are served first, the readings a word teaches next, and what neither pass could serve is asked again of every noun, the floor of ${atLeastCommon} occurrence per million lifted.`,
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

const weak = allocated.filter((one) => common(one.anchor) < atLeastCommon).length

// The split by kind beside the total, since the two answer different questions and the document quotes
// both: a character's reading is reused by every word built on it, a word's reading by one card. A total
// announced in prose that no command prints is a total nobody can check.
const ofCharacters = asked.filter((one) => readings.get(one.value)?.type !== null)
const served = new Set(allocated.map((one) => one.reading))

process.stdout.write(
  `anchors: ${allocated.length} of ${asked.length} readings bound, written to ${at('anchors.json')}, ${weak} of them on a word under ${atLeastCommon} occurrence per million\n`,
)
process.stdout.write(
  `of the ${ofCharacters.length} readings a character teaches, ${ofCharacters.filter((one) => served.has(one.value)).length} are bound\n`,
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
