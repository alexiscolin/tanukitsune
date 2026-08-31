// What the allocation is given: the readings a card teaches, and the words each of them could be
// bound to.
//
// A reading's sounds are derived from its kana here rather than carried beside it, since a reading and
// a pronunciation kept side by side are two things to keep in step and one of them will be wrong. The
// anchor's own sounds come from the lexicon for the same reason, never from what anything claimed the
// word sounds like.
//
// The lexicon is held by first sound because a word can only stand for a reading it begins like, which
// `agreesAtTheStart` decides exactly. Walked whole instead, each of the 2898 readings would read all
// 125461 words and the run would not end in an afternoon.

import type { Named } from './reading-run.ts'
import type { Word } from './lexique.ts'
import type { Candidate, Wanted } from '../../core/corpus/choose.ts'
import type { Allocated } from '../../core/corpus/allocation.ts'
import { distanceBetween } from '../../core/corpus/anchor.ts'
import { moraeOf, phonemesOf } from '../../core/corpus/phonetics.ts'

// An anchor is one word standing for one reading, and no word carries eleven morae. Asked for one
// anyway, a long reading takes whatever the distance forgives, that distance being a fraction of the
// sounds compared: a long word shares a great many of them without sounding like the reading at all.
// No reading a kanji teaches runs past four morae, so the ceiling touches words alone.
// A reading is heard through the ears of the language it is taught in before it is compared. Japanese
// makes sounds French does not, and for most of them a French listener reaches for a neighbour without
// hesitating: /ɕ/ is the sound of chic, /ɾ/ the sound of rire. Compared on the symbol alone those
// readings have no candidate at all rather than a near one.
//
// The substitution moves the reading and never the anchor, so a word still claims only sounds its own
// language makes, which is what `impossibleOnset` refuses. A locale reaching for nothing on a sound
// states it as nothing, and the reading then begins on what follows: what carries the lost sound is
// then the spelling of the anchor rather than its pronunciation, which is the caller's to ask for.
export function wantedFrom(
  readings: ReadonlyMap<string, Named>,
  atMostMorae: number,
  hears: ReadonlyMap<string, string> = new Map(),
): readonly Wanted[] {
  const carried = new Set([...readings].flatMap(([value]) => phonemesOf(value)))
  refuseAMerge(hears, carried)

  return [...readings]
    .filter(([value, named]) => named.taught && moraeOf(value).length <= atMostMorae)
    .map(([value, named]) => ({
      value,
      phonemes: phonemesOf(value)
        .map((sound) => hears.get(sound) ?? sound)
        .filter((sound) => sound !== ''),
      // The shapes naming this reading, which is how many cards the word bought for it will be met on.
      serves: named.by.length,
    }))
}

// A substitution may bring one sound onto another and never two onto one, and never onto a sound the
// language taught already makes: the onset is where the rules are exact, so two readings sharing one
// give the reader a single cue with two answers, and neither of them is wrong to write. Hearing shi
// and chi both as the sound of chic is the first, and hearing tsu as /s/ is the second, su being /s/
// already.
function refuseAMerge(hears: ReadonlyMap<string, string>, carried: ReadonlySet<string>): void {
  const onto = new Map<string, string>()

  for (const [sound, heard] of hears) {
    if (heard === '') continue

    const already = onto.get(heard)
    if (already !== undefined) throw new Error(`${already} and ${sound} are both heard as ${heard}, which is one cue for two`)
    if (carried.has(heard)) throw new Error(`${sound} is heard as ${heard}, which a reading already carries: one cue for two`)

    onto.set(heard, sound)
  }
}

// Which words a locale draws its anchors from is that locale's business rather than the engine's, so
// the run is told what to keep rather than deciding it here.
export function candidatesBy(
  lexicon: ReadonlyMap<string, Word>,
  keeps: (word: Word, text: string) => boolean,
): (reading: Wanted) => readonly Candidate[] {
  const held = new Map<string, Candidate[]>()

  for (const [text, word] of lexicon) {
    const [onset] = word.phonemes
    if (onset === undefined || !keeps(word, text)) continue

    // A word nothing rated carries no rating rather than a low one, the limits saying what unrated is
    // worth: rated zero, a word nobody was asked about would lose to every word anybody was.
    const rating = word.imageability === undefined ? {} : { imageability: word.imageability }
    held.set(onset, [...(held.get(onset) ?? []), { text, phonemes: word.phonemes, frequency: word.frequency, ...rating }])
  }

  return (reading) => held.get(reading.phonemes[0] ?? '') ?? []
}

// What a phrase sounds like, word by word out of the lexicon. A reading of four morae is rarely one
// French word and often a short phrase, and the table searches words one at a time, so a phrase is
// something only a proposal can bring. Its sounds are still derived and never claimed: an anchor whose
// pronunciation is taken on trust is the failure the whole layer exists to catch.
//
// Nothing where a word of it is unknown, which is a different answer from an empty one: a word the
// lexicon does not hold is a word nothing here can pronounce.
export function soundsOf(phrase: string, lexicon: ReadonlyMap<string, Word>): readonly string[] | null {
  const sounds: string[] = []

  for (const word of phrase.trim().toLowerCase().split(/\s+/)) {
    const said = lexicon.get(word)
    if (said === undefined) return null

    sounds.push(...said.phonemes)
  }

  return sounds
}

// The few a bounded run asks, spread across the whole of what is owed rather than taken from its head.
// The four paid steps beside this one take the head and are right to: what they owe shrinks as they
// succeed, so their head advances of itself. What is owed here does not, a reading refused staying
// owed, so its head is the same question every run.
// A bound exists so a first run is read by hand before the rest is paid for, and a sample of the
// hardest corner says nothing about the rest: what is owed here is ordered by why it is owed, so its
// head is the readings the language serves worst and its tail the ones it nearly served.
export function spread<T>(owed: readonly T[], most: number): readonly T[] {
  if (owed.length <= most) return [...owed]

  const every = owed.length / most

  return Array.from({ length: most }, (_, taken) => owed[Math.floor(taken * every)] as T)
}

// The words still far enough from everything already bound, filtered once against the set as it stands
// rather than once per reading: every reading beginning on one sound would otherwise ask the same
// question of the same bucket, which is the same answer for a three hundredth of the reads.
//
// Held by how many sounds a word has, since two anchors nearer than the limit differ by less than that
// fraction of the longer one, so a word two sounds longer than another is rarely near it. What slips
// through is caught by the sweep, which is the authority.
export function roomyWords(
  lexicon: ReadonlyMap<string, Word>,
  held: readonly Allocated[],
  apart: number,
  keeps: (word: Word, text: string) => boolean,
): ReadonlySet<string> {
  const byLength = new Map<number, Allocated[]>()
  for (const one of held) byLength.set(one.phonemes.length, [...(byLength.get(one.phonemes.length) ?? []), one])

  const roomy = new Set<string>()

  for (const [text, word] of lexicon) {
    if (!keeps(word, text)) continue

    const near = [word.phonemes.length - 1, word.phonemes.length, word.phonemes.length + 1].some((length) =>
      (byLength.get(length) ?? []).some((one) => distanceBetween(one.phonemes, word.phonemes) < apart),
    )
    if (!near) roomy.add(text)
  }

  return roomy
}
