import { distanceBetween } from './anchor.ts'

// Which French word stands for which reading, across the whole curriculum rather than across one
// release. On'yomi are short and share their sounds, so a reading like こう belongs to dozens of
// characters: an anchor spent early is an anchor missing later, and taking it back means rewriting
// every mnemonic that used it.
//
// This is why allocation is a calculation over data and runs before a word of prose exists. Nothing
// inside a prompt can see it, since a prompt writes one item and sees no other.

export type Allocated = {
  readonly reading: string
  readonly anchor: string
  // Derived from a French lexicon, never from what a model said the word sounds like.
  readonly phonemes: readonly string[]
}

// Both directions, because they break differently. Two readings on one anchor give the reader one cue
// for two answers; one reading on two anchors gives them two stories for one answer, and the second is
// the one they will not have read.
export function notInjective(allocation: readonly Allocated[]): readonly string[] {
  const readingsOf = new Map<string, Set<string>>()
  const anchorsOf = new Map<string, Set<string>>()

  for (const { reading, anchor } of allocation) {
    readingsOf.set(anchor, (readingsOf.get(anchor) ?? new Set()).add(reading))
    anchorsOf.set(reading, (anchorsOf.get(reading) ?? new Set()).add(anchor))
  }

  return [...readingsOf, ...anchorsOf].filter(([, held]) => held.size > 1).map(([one]) => one)
}

// Two readings whose anchors sound the same are one cue pointing at both, which is a cue pointing at
// neither. It is the failure that only appears at scale, and only to something looking at the whole
// allocation at once.
export function confusablePairs(
  allocation: readonly Allocated[],
  minimum: number,
): readonly (readonly [string, string])[] {
  const pairs: (readonly [string, string])[] = []

  for (const [index, one] of allocation.entries()) {
    for (const other of allocation.slice(index + 1)) {
      if (one.reading === other.reading) continue
      if (distanceBetween(one.phonemes, other.phonemes) < minimum) pairs.push([one.reading, other.reading])
    }
  }

  return pairs
}
