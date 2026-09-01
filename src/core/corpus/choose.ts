import { agreesAtTheStart, carriesTheReading, distanceBetween } from './anchor.ts'
import type { Allocated } from './allocation'

// Which word stands for which reading, decided over the whole curriculum before a word of prose
// exists. The rules in `anchor.ts` say whether one word can stand for one reading; this says which of
// the words that can, does, and it is a different question: anchors are a shared resource, and a good
// word spent on an easy reading is a scarce reading left with nothing.

export type Candidate = {
  readonly text: string
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
  // How many cards this reading is taught on. A word spent on a reading fifty characters carry buys
  // fifty cards; the same word spent on a reading one character carries buys one. Absent is one, so a
  // caller that counts nothing gets the order it had.
  readonly serves?: number
}

export type Limits = {
  // How far a word may sit from the reading and still be heard in it.
  readonly nearest: number
  // How far two anchors must sit from each other, which is what stops one cue answering twice.
  readonly apart: number
  // What an unrated word is worth against a rated one, on the scale this locale's ratings use. The
  // middle of that scale, because nothing rated the word and that is not evidence either way, and it
  // is material rather than engine: a locale rating from 0 to 100 sets a different number here.
  readonly unrated: number
  // How near two sounds may be and still count as the same one, when a word is asked to say the
  // reading rather than resemble it.
  readonly sameSound: number
}

// Why a reading went without, since a reading named alone leaves the reader nothing to rule on. No
// word the rules accept means the lexicon is too narrow for this reading; none free means the words
// exist and the curriculum has already spent them, on another reading or too near one.
export type Unserved = {
  readonly reading: string
  readonly reason: 'none acceptable' | 'none free'
}

export function allocate(
  readings: readonly Wanted[],
  candidatesFor: (reading: Wanted) => readonly Candidate[],
  limits: Limits,
): { readonly allocated: readonly Allocated[]; readonly unserved: readonly Unserved[] } {
  // The reading with fewest words per card first. Serving them in the order they arrive spends a
  // common word on a reading that had ten others and leaves the one that had two with nothing, and a
  // reading with no anchor is a card that cannot be written at all.
  //
  // Per card rather than outright, because a reading is met on every character that teaches it: four
  // words for a reading fifty characters carry is shorter than one word for a reading one character
  // carries, and leaving the first out strands fifty cards where the second strands one. Counted
  // outright over the French curriculum, 214 cards are left without a reading a story can be built on;
  // counted per card, 155.
  const order = readings
    .map((reading) => ({ reading, accepted: ranked(reading, candidatesFor(reading), limits) }))
    .sort(
      (one, other) =>
        one.accepted.length / Math.max(one.reading.serves ?? 1, 1) -
        other.accepted.length / Math.max(other.reading.serves ?? 1, 1),
    )

  const allocated: Allocated[] = []
  const unserved: Unserved[] = []
  const taken = new Set<string>()

  for (const { reading, accepted } of order) {
    const best = accepted.find(
      (candidate) => !taken.has(candidate.text) && farEnough(candidate, allocated, limits.apart),
    )

    if (best === undefined) {
      unserved.push({ reading: reading.value, reason: accepted.length === 0 ? 'none acceptable' : 'none free' })
      continue
    }

    taken.add(best.text)
    allocated.push({ reading: reading.value, anchor: best.text, phonemes: best.phonemes })
  }

  return { allocated, unserved }
}

// Everything the rules accept for one reading, best first. Heard first, seen second, ordinary third:
// distance decides whether a word reaches the reading at all, and among the ones that do, a word the
// reader can picture beats a word they merely know, while a word nobody knows is a cue to be learned
// before it can help. Nothing in that order depends on what other readings take, so it is settled
// once per reading and the loop takes the first word still free.
function ranked(reading: Wanted, candidates: readonly Candidate[], limits: Limits): readonly Candidate[] {
  // Agreeing at the start is exact on the consonant, so a word claiming a sound the language does not
  // make cannot reach here: it would have to begin on the reading's own first sound. That rule judges
  // an anchor written rather than chosen, and it belongs to the per-item checks.
  return candidates
    .filter((candidate) => agreesAtTheStart(reading.phonemes, candidate.phonemes))
    .map((candidate) => ({
      candidate,
      heard: distanceBetween(reading.phonemes, candidate.phonemes),
      // Whether the word says the reading rather than resembling it, which is what the keyword method
      // asks for and what a distance cannot answer: issue comes out near いち on one vowel.
      says: carriesTheReading(reading.phonemes, candidate.phonemes, limits.sameSound),
    }))
    .filter((one) => one.heard <= limits.nearest)
    .sort(
      (one, other) =>
        Number(other.says) - Number(one.says) ||
        one.heard - other.heard ||
        (other.candidate.imageability ?? limits.unrated) - (one.candidate.imageability ?? limits.unrated) ||
        other.candidate.frequency - one.candidate.frequency,
    )
    .map((one) => one.candidate)
}

function farEnough(candidate: Candidate, allocated: readonly Allocated[], apart: number): boolean {
  return allocated.every((one) => distanceBetween(one.phonemes, candidate.phonemes) >= apart)
}
