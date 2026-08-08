import { distanceBetween } from './anchor'

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

export function notInjective(_allocation: readonly Allocated[]): readonly string[] {
  return []
}

export function confusablePairs(
  _allocation: readonly Allocated[],
  _minimum: number,
): readonly (readonly [string, string])[] {
  return []
}
