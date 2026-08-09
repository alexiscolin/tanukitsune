import { agreesAtTheStart, distanceBetween, impossibleOnset } from './anchor'
import type { Allocated } from './allocation'

// Which word stands for which reading, decided over the whole curriculum before a word of prose
// exists. The rules in `anchor.ts` say whether one word can stand for one reading; this says which of
// the words that can, does, and it is a different question: anchors are a shared resource, and a good
// word spent on an easy reading is a scarce reading left with nothing.

export type Candidate = {
  readonly text: string
  // Derived from the language's own lexicon, never from what a model said the word sounds like.
  readonly phonemes: readonly string[]
  readonly frequency: number
  // How well the word can be seen, on the scale the locale's ratings use. The best-evidenced property
  // of a keyword: the method works for words a reader can picture and does nothing for the others.
  // Absent where nothing rated it, which is not the same as rated low.
  readonly imageability?: number
}

export type Wanted = {
  readonly value: string
  readonly phonemes: readonly string[]
}

export type Limits = {
  // How far a word may sit from the reading and still be heard in it.
  readonly nearest: number
  // How far two anchors must sit from each other, which is what stops one cue answering twice.
  readonly apart: number
  // What the language cannot begin a word with, from that locale's own material.
  readonly cannotStart: readonly string[]
  // What an unrated word is worth against a rated one, on the scale this locale's ratings use. The
  // middle of that scale, because nothing rated the word and that is not evidence either way, and it
  // is material rather than engine: a locale rating from 0 to 100 sets a different number here.
  readonly unrated: number
}

// Why a reading went without, since a reading named alone leaves the reader nothing to rule on. No
// word the rules accept means the lexicon is too narrow for this reading; every acceptable word
// already spent means the curriculum wants more words than the reading has.
export type Unserved = {
  readonly reading: string
  readonly reason: 'none acceptable' | 'all spent'
}

export function allocate(
  readings: readonly Wanted[],
  candidatesFor: (reading: Wanted) => readonly Candidate[],
  limits: Limits,
): { readonly allocated: readonly Allocated[]; readonly unserved: readonly Unserved[] } {
  const acceptable = new Map(readings.map((reading) => [reading.value, usable(reading, candidatesFor, limits)]))

  // The scarcest reading first. Serving them in the order they arrive spends a common word on a
  // reading that had ten others and leaves the one that had two with nothing, and a reading with no
  // anchor is a card that cannot be written at all.
  const order = [...readings].sort(
    (one, other) => (acceptable.get(one.value)?.length ?? 0) - (acceptable.get(other.value)?.length ?? 0),
  )

  const allocated: Allocated[] = []
  const unserved: Unserved[] = []
  const taken = new Set<string>()

  for (const reading of order) {
    const accepted = acceptable.get(reading.value) ?? []
    const free = accepted.filter(
      (candidate) => !taken.has(candidate.text) && farEnough(candidate, allocated, limits.apart),
    )

    // Heard first, seen second, ordinary third. Distance decides whether the word reaches the reading
    // at all; among the ones that do, a word the reader can picture beats a word they merely know,
    // and a word nobody knows is a cue to be learned before it can help.
    const best = [...free].sort(
      (one, other) =>
        distanceBetween(reading.phonemes, one.phonemes) - distanceBetween(reading.phonemes, other.phonemes) ||
        (other.imageability ?? limits.unrated) - (one.imageability ?? limits.unrated) ||
        other.frequency - one.frequency,
    )[0]

    if (best === undefined) {
      unserved.push({ reading: reading.value, reason: accepted.length === 0 ? 'none acceptable' : 'all spent' })
      continue
    }

    taken.add(best.text)
    allocated.push({ reading: reading.value, anchor: best.text, phonemes: best.phonemes })
  }

  return { allocated, unserved }
}

// Everything the rules accept for one reading, before anything is taken. Computed once per reading
// rather than per attempt, since it decides the order and the order decides the outcome.
function usable(
  reading: Wanted,
  candidatesFor: (reading: Wanted) => readonly Candidate[],
  limits: Limits,
): readonly Candidate[] {
  return candidatesFor(reading).filter(
    (candidate) =>
      agreesAtTheStart(reading.phonemes, candidate.phonemes) &&
      impossibleOnset(reading.phonemes, candidate.phonemes, limits.cannotStart) === null &&
      distanceBetween(reading.phonemes, candidate.phonemes) <= limits.nearest,
  )
}

function farEnough(candidate: Candidate, allocated: readonly Allocated[], apart: number): boolean {
  return allocated.every((one) => distanceBetween(one.phonemes, candidate.phonemes) >= apart)
}
