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
// language makes, which is what `impossibleOnset` refuses. A sound the locale reaches for nothing on is
// simply absent from the table: French hears no /h/ at all, hotel being said without one, so those
// readings stay unanchored rather than being given a word that matches on paper.
export function wantedFrom(
  readings: ReadonlyMap<string, Named>,
  atMostMorae: number,
  hears: ReadonlyMap<string, string> = new Map(),
): readonly Wanted[] {
  return [...readings]
    .filter(([value, named]) => named.taught && moraeOf(value).length <= atMostMorae)
    .map(([value]) => ({ value, phonemes: phonemesOf(value).map((sound) => hears.get(sound) ?? sound) }))
}

// Which words a locale draws its anchors from is that locale's business rather than the engine's, so
// the run is told what to keep rather than deciding it here.
export function candidatesBy(
  lexicon: ReadonlyMap<string, Word>,
  keeps: (word: Word) => boolean,
): (reading: Wanted) => readonly Candidate[] {
  const held = new Map<string, Candidate[]>()

  for (const [text, word] of lexicon) {
    const [onset] = word.phonemes
    if (onset === undefined || !keeps(word)) continue

    // A word nothing rated carries no rating rather than a low one, the limits saying what unrated is
    // worth: rated zero, a word nobody was asked about would lose to every word anybody was.
    const rating = word.imageability === undefined ? {} : { imageability: word.imageability }
    held.set(onset, [...(held.get(onset) ?? []), { text, phonemes: word.phonemes, frequency: word.frequency, ...rating }])
  }

  return (reading) => held.get(reading.phonemes[0] ?? '') ?? []
}
