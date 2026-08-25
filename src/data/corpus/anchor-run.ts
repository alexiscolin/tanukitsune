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
import { phonemesOf } from '../../core/corpus/phonetics.ts'

export function wantedFrom(readings: ReadonlyMap<string, Named>): readonly Wanted[] {
  return [...readings]
    .filter(([, named]) => named.taught)
    .map(([value]) => ({ value, phonemes: phonemesOf(value) }))
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

    // Nothing rates a French word for how well it can be seen, the lexicon stating frequency and
    // sounds alone, so every candidate arrives unrated and the limits say what that is worth.
    held.set(onset, [...(held.get(onset) ?? []), { text, phonemes: word.phonemes, frequency: word.frequency }])
  }

  return (reading) => held.get(reading.phonemes[0] ?? '') ?? []
}
